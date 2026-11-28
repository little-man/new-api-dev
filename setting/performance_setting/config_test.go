package performance_setting

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
)

func TestSyncToCommonCPUThresholdEnvOverride(t *testing.T) {
	originalSetting := performanceSetting
	originalConfig := common.GetPerformanceMonitorConfig()
	t.Cleanup(func() {
		performanceSetting = originalSetting
		common.SetPerformanceMonitorConfig(originalConfig)
	})
	performanceSetting.MonitorCPUThreshold = 90

	t.Setenv("PERFORMANCE_MONITOR_CPU_THRESHOLD", "0")
	syncToCommon()
	assert.Equal(t, 0, common.GetPerformanceMonitorConfig().CPUThreshold)

	t.Setenv("PERFORMANCE_MONITOR_CPU_THRESHOLD", "101")
	syncToCommon()
	assert.Equal(t, 90, common.GetPerformanceMonitorConfig().CPUThreshold)

	t.Setenv("PERFORMANCE_MONITOR_CPU_THRESHOLD", "")
	syncToCommon()
	assert.Equal(t, 90, common.GetPerformanceMonitorConfig().CPUThreshold)
}
