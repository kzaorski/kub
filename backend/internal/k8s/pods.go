package k8s

import (
	"context"
	"fmt"
	"time"

	"github.com/krzyzao/kub/internal/models"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
)

// GetPods returns all pods in the given namespace
func (c *Client) GetPods(ctx context.Context, namespace string) ([]models.Pod, error) {
	listOpts := metav1.ListOptions{}

	var podList *corev1.PodList
	var err error

	if namespace == "" || namespace == "all" {
		podList, err = c.Clientset.CoreV1().Pods("").List(ctx, listOpts)
	} else {
		podList, err = c.Clientset.CoreV1().Pods(namespace).List(ctx, listOpts)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list pods: %w", err)
	}

	pods := make([]models.Pod, 0, len(podList.Items))
	for _, p := range podList.Items {
		pods = append(pods, convertPod(p))
	}

	return pods, nil
}

// GetPod returns a specific pod
func (c *Client) GetPod(ctx context.Context, namespace, name string) (*models.Pod, error) {
	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get pod: %w", err)
	}

	p := convertPod(*pod)
	return &p, nil
}

// WatchPods returns a watch interface for pods in the given namespace
func (c *Client) WatchPods(ctx context.Context, namespace string) (watch.Interface, error) {
	listOpts := metav1.ListOptions{
		Watch: true,
	}

	if namespace == "" || namespace == "all" {
		return c.Clientset.CoreV1().Pods("").Watch(ctx, listOpts)
	}
	return c.Clientset.CoreV1().Pods(namespace).Watch(ctx, listOpts)
}

func convertPod(p corev1.Pod) models.Pod {
	containers := make([]models.Container, 0, len(p.Spec.Containers))

	// Calculate total resource requests and limits
	var totalCPURequest, totalCPULimit, totalMemRequest, totalMemLimit int64

	for _, c := range p.Spec.Containers {
		container := models.Container{
			Name:    c.Name,
			Image:   c.Image,
			Command: c.Command,
			Args:    c.Args,
		}

		// Find container status
		for _, cs := range p.Status.ContainerStatuses {
			if cs.Name == c.Name {
				container.Ready = cs.Ready
				container.RestartCount = cs.RestartCount
				container.State = getContainerState(cs.State)
				container.StateDetails = getContainerStateDetails(cs.State)
				if cs.State.Running != nil {
					startedAt := cs.State.Running.StartedAt.Time
					container.StartedAt = &startedAt
				}
				break
			}
		}

		// Convert volume mounts
		for _, vm := range c.VolumeMounts {
			container.VolumeMounts = append(container.VolumeMounts, models.VolumeMount{
				Name:      vm.Name,
				MountPath: vm.MountPath,
				ReadOnly:  vm.ReadOnly,
				SubPath:   vm.SubPath,
			})
		}

		// Convert env vars (limit to avoid large payloads)
		for _, env := range c.Env {
			envVar := models.EnvVar{Name: env.Name}
			if env.Value != "" {
				envVar.Value = env.Value
			} else if env.ValueFrom != nil {
				if env.ValueFrom.SecretKeyRef != nil {
					envVar.ValueFrom = fmt.Sprintf("Secret:%s/%s", env.ValueFrom.SecretKeyRef.Name, env.ValueFrom.SecretKeyRef.Key)
				} else if env.ValueFrom.ConfigMapKeyRef != nil {
					envVar.ValueFrom = fmt.Sprintf("ConfigMap:%s/%s", env.ValueFrom.ConfigMapKeyRef.Name, env.ValueFrom.ConfigMapKeyRef.Key)
				} else if env.ValueFrom.FieldRef != nil {
					envVar.ValueFrom = fmt.Sprintf("FieldRef:%s", env.ValueFrom.FieldRef.FieldPath)
				}
			}
			container.Env = append(container.Env, envVar)
		}

		// Convert ports
		for _, port := range c.Ports {
			container.Ports = append(container.Ports, models.ContainerPort{
				Name:          port.Name,
				ContainerPort: port.ContainerPort,
				Protocol:      string(port.Protocol),
			})
		}

		// Convert resources
		if c.Resources.Requests != nil || c.Resources.Limits != nil {
			container.Resources = models.ResourceRequirements{}
			if c.Resources.Requests != nil {
				if cpu := c.Resources.Requests.Cpu(); cpu != nil && !cpu.IsZero() {
					container.Resources.RequestsCPU = cpu.String()
				}
				if mem := c.Resources.Requests.Memory(); mem != nil && !mem.IsZero() {
					container.Resources.RequestsMemory = mem.String()
				}
			}
			if c.Resources.Limits != nil {
				if cpu := c.Resources.Limits.Cpu(); cpu != nil && !cpu.IsZero() {
					container.Resources.LimitsCPU = cpu.String()
				}
				if mem := c.Resources.Limits.Memory(); mem != nil && !mem.IsZero() {
					container.Resources.LimitsMemory = mem.String()
				}
			}
		}

		// Convert security context
		if c.SecurityContext != nil {
			container.SecurityContext = &models.SecurityContext{
				RunAsUser:    c.SecurityContext.RunAsUser,
				RunAsNonRoot: c.SecurityContext.RunAsNonRoot,
				ReadOnlyFS:   c.SecurityContext.ReadOnlyRootFilesystem,
				Privileged:   c.SecurityContext.Privileged,
			}
		}

		// Accumulate resource requests
		if c.Resources.Requests != nil {
			if cpu := c.Resources.Requests.Cpu(); cpu != nil {
				totalCPURequest += cpu.MilliValue()
			}
			if mem := c.Resources.Requests.Memory(); mem != nil {
				totalMemRequest += mem.Value()
			}
		}

		// Accumulate resource limits
		if c.Resources.Limits != nil {
			if cpu := c.Resources.Limits.Cpu(); cpu != nil {
				totalCPULimit += cpu.MilliValue()
			}
			if mem := c.Resources.Limits.Memory(); mem != nil {
				totalMemLimit += mem.Value()
			}
		}

		containers = append(containers, container)
	}

	// Calculate ready containers
	readyCount := 0
	totalCount := len(p.Status.ContainerStatuses)
	var totalRestarts int32 = 0

	for _, cs := range p.Status.ContainerStatuses {
		if cs.Ready {
			readyCount++
		}
		totalRestarts += cs.RestartCount
	}

	ready := fmt.Sprintf("%d/%d", readyCount, totalCount)

	// Calculate age
	age := formatDuration(time.Since(p.CreationTimestamp.Time))

	// Get pod IP
	ip := p.Status.PodIP
	if ip == "" {
		ip = "-"
	}

	status := getPodStatus(p)

	// Convert conditions
	conditions := make([]models.PodCondition, 0, len(p.Status.Conditions))
	for _, cond := range p.Status.Conditions {
		conditions = append(conditions, models.PodCondition{
			Type:               string(cond.Type),
			Status:             string(cond.Status),
			LastTransitionTime: cond.LastTransitionTime.Time,
			Reason:             cond.Reason,
			Message:            cond.Message,
		})
	}

	// Convert volumes
	volumes := make([]models.Volume, 0, len(p.Spec.Volumes))
	for _, v := range p.Spec.Volumes {
		vol := models.Volume{Name: v.Name}
		vol.Type, vol.Source = getVolumeTypeAndSource(v)
		volumes = append(volumes, vol)
	}

	// Convert owner references
	ownerRefs := make([]models.OwnerReference, 0, len(p.OwnerReferences))
	for _, ref := range p.OwnerReferences {
		ownerRefs = append(ownerRefs, models.OwnerReference{
			Kind: ref.Kind,
			Name: ref.Name,
			UID:  string(ref.UID),
		})
	}

	// Convert tolerations
	tolerations := make([]models.Toleration, 0, len(p.Spec.Tolerations))
	for _, t := range p.Spec.Tolerations {
		tolerations = append(tolerations, models.Toleration{
			Key:      t.Key,
			Operator: string(t.Operator),
			Value:    t.Value,
			Effect:   string(t.Effect),
		})
	}

	return models.Pod{
		Name:            p.Name,
		Namespace:       p.Namespace,
		Status:          status,
		Phase:           string(p.Status.Phase),
		Ready:           ready,
		Restarts:        totalRestarts,
		Age:             age,
		IP:              ip,
		Node:            p.Spec.NodeName,
		Labels:          p.Labels,
		Annotations:     p.Annotations,
		CreatedAt:       p.CreationTimestamp.Time,
		Containers:      containers,
		CPURequest:      totalCPURequest,
		CPULimit:        totalCPULimit,
		MemoryRequest:   totalMemRequest,
		MemoryLimit:     totalMemLimit,
		Conditions:      conditions,
		Volumes:         volumes,
		OwnerReferences: ownerRefs,
		Tolerations:     tolerations,
		NodeSelector:    p.Spec.NodeSelector,
		ServiceAccount:  p.Spec.ServiceAccountName,
		QOSClass:        string(p.Status.QOSClass),
		PriorityClass:   p.Spec.PriorityClassName,
	}
}

func getPodStatus(pod corev1.Pod) string {
	// Check for deletion
	if pod.DeletionTimestamp != nil {
		return "Terminating"
	}

	// Check init containers - only report if waiting or failed
	for _, cs := range pod.Status.InitContainerStatuses {
		if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
			return "Init:" + cs.State.Waiting.Reason
		}
		// Only report terminated init containers if they failed (non-zero exit code)
		if cs.State.Terminated != nil && cs.State.Terminated.ExitCode != 0 {
			reason := cs.State.Terminated.Reason
			if reason == "" {
				reason = "Error"
			}
			return "Init:" + reason
		}
	}

	// Check container statuses - prioritize error states
	for _, cs := range pod.Status.ContainerStatuses {
		// Check current waiting state (e.g., CrashLoopBackOff, ImagePullBackOff)
		if cs.State.Waiting != nil && cs.State.Waiting.Reason != "" {
			return cs.State.Waiting.Reason
		}
		// Check last terminated state for failed containers (e.g., when container crashes and is waiting to restart)
		if cs.LastTerminationState.Terminated != nil && cs.LastTerminationState.Terminated.ExitCode != 0 {
			// Container previously failed with error
			if cs.State.Waiting != nil {
				// Currently waiting to restart - return the waiting reason
				if cs.State.Waiting.Reason != "" {
					return cs.State.Waiting.Reason
				}
				return "CrashLoopBackOff"
			}
		}
		if cs.State.Terminated != nil && cs.State.Terminated.Reason != "" {
			return cs.State.Terminated.Reason
		}
	}

	// Check if not all containers are ready
	readyCount := 0
	for _, cs := range pod.Status.ContainerStatuses {
		if cs.Ready {
			readyCount++
		}
	}
	if readyCount < len(pod.Status.ContainerStatuses) && len(pod.Status.ContainerStatuses) > 0 {
		// At least one container is not ready
		return string(pod.Status.Phase)
	}

	// Check conditions
	for _, cond := range pod.Status.Conditions {
		if cond.Type == corev1.PodReady && cond.Status == corev1.ConditionTrue {
			return "Running"
		}
	}

	return string(pod.Status.Phase)
}

func getContainerState(state corev1.ContainerState) string {
	if state.Running != nil {
		return "Running"
	}
	if state.Waiting != nil {
		if state.Waiting.Reason != "" {
			return state.Waiting.Reason
		}
		return "Waiting"
	}
	if state.Terminated != nil {
		if state.Terminated.Reason != "" {
			return state.Terminated.Reason
		}
		return "Terminated"
	}
	return "Unknown"
}

func getContainerStateDetails(state corev1.ContainerState) string {
	if state.Running != nil {
		return fmt.Sprintf("Started at %s", state.Running.StartedAt.Time.Format(time.RFC3339))
	}
	if state.Waiting != nil {
		if state.Waiting.Message != "" {
			return state.Waiting.Message
		}
		return state.Waiting.Reason
	}
	if state.Terminated != nil {
		details := fmt.Sprintf("Exit code: %d", state.Terminated.ExitCode)
		if state.Terminated.Message != "" {
			details += ", " + state.Terminated.Message
		}
		return details
	}
	return ""
}

func getVolumeTypeAndSource(v corev1.Volume) (string, string) {
	switch {
	case v.ConfigMap != nil:
		return "ConfigMap", v.ConfigMap.Name
	case v.Secret != nil:
		return "Secret", v.Secret.SecretName
	case v.PersistentVolumeClaim != nil:
		return "PVC", v.PersistentVolumeClaim.ClaimName
	case v.EmptyDir != nil:
		return "EmptyDir", ""
	case v.HostPath != nil:
		return "HostPath", v.HostPath.Path
	case v.Projected != nil:
		return "Projected", ""
	case v.DownwardAPI != nil:
		return "DownwardAPI", ""
	case v.NFS != nil:
		return "NFS", v.NFS.Server + ":" + v.NFS.Path
	default:
		return "Unknown", ""
	}
}

func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	days := int(d.Hours() / 24)
	return fmt.Sprintf("%dd", days)
}
