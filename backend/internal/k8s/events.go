package k8s

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
)

// WatchEvents returns a watch interface for events
func (c *Client) WatchEvents(ctx context.Context, namespace string) (watch.Interface, error) {
	listOpts := metav1.ListOptions{
		Watch: true,
	}

	if namespace == "" || namespace == "all" {
		return c.Clientset.CoreV1().Events("").Watch(ctx, listOpts)
	}
	return c.Clientset.CoreV1().Events(namespace).Watch(ctx, listOpts)
}
