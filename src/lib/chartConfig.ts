import { ChartOptions } from 'chart.js';

// Apple-inspired color palette that works well in both light and dark modes
export const CHART_COLORS = {
    primary: [
        '#007AFF', // iOS Blue
        '#FF3B30', // iOS Red
        '#34C759', // iOS Green
        '#FF9500', // iOS Orange
        '#AF52DE', // iOS Purple
        '#FF2D92', // iOS Pink
        '#5AC8FA', // iOS Light Blue
        '#FFCC02', // iOS Yellow
        '#FF6B35', // iOS Deep Orange
        '#4CD964', // iOS Light Green
        '#FF9500', // iOS Orange
        '#007AFF', // iOS Blue
        '#FF3B30', // iOS Red
        '#34C759', // iOS Green
        '#AF52DE', // iOS Purple
    ],
    gradients: {
        primary: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)',
        success: 'linear-gradient(135deg, #34C759 0%, #4CD964 100%)',
        warning: 'linear-gradient(135deg, #FF9500 0%, #FFCC02 100%)',
        danger: 'linear-gradient(135deg, #FF3B30 0%, #FF6B35 100%)',
    },
    semantic: {
        income: '#34C759',
        expense: '#FF3B30',
        neutral: '#8E8E93',
    }
};

// Theme-aware colors
export const getThemeColors = (isDark: boolean) => ({
    background: isDark ? '#1F2937' : '#FFFFFF',
    surface: isDark ? '#374151' : '#F9FAFB',
    text: {
        primary: isDark ? '#F9FAFB' : '#111827',
        secondary: isDark ? '#D1D5DB' : '#6B7280',
        muted: isDark ? '#9CA3AF' : '#9CA3AF',
    },
    border: isDark ? '#4B5563' : '#E5E7EB',
    grid: isDark ? '#374151' : '#F3F4F6',
    tooltip: {
        background: isDark ? '#1F2937' : '#FFFFFF',
        border: isDark ? '#4B5563' : '#E5E7EB',
        text: isDark ? '#F9FAFB' : '#111827',
    },
    legend: {
        text: isDark ? '#F9FAFB' : '#111827',
    }
});

// Common chart options for consistent styling
export const getCommonChartOptions = (isDark: boolean): Partial<ChartOptions> => {
    const colors = getThemeColors(isDark);

    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: colors.text.secondary,
                    padding: 20,
                    usePointStyle: true,
                    font: {
                        size: 12,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        weight: 500,
                    },
                    generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels && data.datasets && data.datasets[0]) {
                            return data.labels.map((label, index) => ({
                                text: String(label),
                                fillStyle: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
                                strokeStyle: CHART_COLORS.primary[index % CHART_COLORS.primary.length],
                                pointStyle: 'circle' as const,
                                pointRadius: 6,
                                pointHoverRadius: 8,
                                index,
                            }));
                        }
                        return [];
                    },
                },
            },
            tooltip: {
                backgroundColor: colors.tooltip.background,
                titleColor: colors.tooltip.text,
                bodyColor: colors.text.secondary,
                borderColor: colors.tooltip.border,
                borderWidth: 1,
                cornerRadius: 12,
                displayColors: true,
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 600,
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                },
                bodyFont: {
                    size: 13,
                    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                },
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.parsed;
                        return `${label}: $${value.toFixed(2)}`;
                    },
                },
            },
        },
        elements: {
            point: {
                hoverRadius: 8,
                radius: 6,
                borderWidth: 2,
                borderColor: colors.background,
            },
            line: {
                tension: 0.4,
                borderWidth: 3,
            },
            bar: {
                borderRadius: 8,
                borderSkipped: false,
            },
        },
        scales: {
            x: {
                grid: {
                    color: colors.grid,
                },
                ticks: {
                    color: colors.text.secondary,
                    font: {
                        size: 12,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    },
                    padding: 8,
                },
            },
            y: {
                grid: {
                    color: colors.grid,
                },
                ticks: {
                    color: colors.text.secondary,
                    font: {
                        size: 12,
                        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    },
                    padding: 8,
                    callback: function (value: any) {
                        return `$${value.toFixed(0)}`;
                    },
                },
                border: {
                    display: false,
                },
            },
        },
    };
};
