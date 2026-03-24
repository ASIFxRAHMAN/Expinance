import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Skia } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolate, runOnJS, useDerivedValue, withTiming } from 'react-native-reanimated';
import * as d3 from 'd3-shape';

export type ChartDataPoint = {
    label: string;
    value: number;
    fullDate?: string;
};

interface InteractiveChartProps {
    monthlyData: ChartDataPoint[]; // Broad overview (e.g. 6 points)
    dailyData: ChartDataPoint[];   // Fine detail (e.g. 30 points)
    width: number;
    height: number;
    color: string;
    textColor: string;
}

export default function InteractiveChart({ monthlyData, dailyData, width, height, color, textColor }: InteractiveChartProps) {
    const padding = 20;

    // Safety check
    if (!monthlyData || monthlyData.length === 0 || !dailyData || dailyData.length === 0) {
        return (
            <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: textColor }}>Not enough data for chart.</Text>
            </View>
        );
    }

    const scale = useSharedValue(1);

    // Determine active dataset based on zoom scale
    // If scale > 1.5, we show daily data, else monthly
    const [isDaily, setIsDaily] = useState(false);

    useDerivedValue(() => {
        if (scale.value > 1.4 && !isDaily) {
            runOnJS(setIsDaily)(true);
        } else if (scale.value < 1.2 && isDaily) {
            runOnJS(setIsDaily)(false);
        }
    });

    const activeData = isDaily ? dailyData : monthlyData;

    // Create D3 Paths
    const pathInfo = useMemo(() => {
        const minVal = Math.min(...activeData.map(d => d.value));
        const maxVal = Math.max(...activeData.map(d => d.value));
        const range = maxVal - minVal || 1;

        const scaleX = (index: number) => padding + (index / Math.max(1, activeData.length - 1)) * (width - padding * 2);
        // Add padding to top and bottom to ensure curves don't clip
        const scaleY = (val: number) => height - padding - ((val - minVal) / range) * (height - padding * 2);

        const line = d3.line<ChartDataPoint>()
            .x((d, i) => scaleX(i))
            .y(d => scaleY(d.value))
            .curve(d3.curveMonotoneX);

        const svgPathString = line(activeData) || '';
        const strokePath = Skia.Path.MakeFromSVGString(svgPathString);

        const startX = scaleX(0);
        const endX = scaleX(activeData.length - 1);

        const fillPath = Skia.Path.MakeFromSVGString(svgPathString);
        if (fillPath) {
            fillPath.lineTo(endX, height);
            fillPath.lineTo(startX, height);
            fillPath.close();
        }

        return { strokePath, fillPath, maxVal, minVal, range, length: activeData.length };
    }, [activeData, width, height]);

    // Timer ref to clear tooltip after 2 seconds
    const tooltipTimer = React.useRef<NodeJS.Timeout | null>(null);

    const setClearTimer = () => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
        tooltipTimer.current = setTimeout(() => {
            isVisible.value = 0; // Trigger fade out, but keep coordinates intact!
        }, 2000);
    };

    const clearExistingTimer = () => {
        if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };

    // Pan Gesture for Scrubbing
    const touchX = useSharedValue(-1);
    const isVisible = useSharedValue(0);

    const pan = Gesture.Pan()
        .onBegin((e) => {
            runOnJS(clearExistingTimer)();
            touchX.value = e.x;
            isVisible.value = 1;
        })
        .onChange((e) => {
            touchX.value = e.x;
        })
        .onEnd(() => {
            runOnJS(setClearTimer)();
        })
        .onFinalize(() => {
            runOnJS(setClearTimer)();
        });

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            // Keep scale between 1 and 3
            // scale.value = Math.max(1, Math.min(e.scale, 3));
            scale.value = withSpring(Math.max(1, Math.min(e.scale, 3)), { damping: 20, stiffness: 90 });
        })
        .onEnd(() => {
            if (scale.value < 1.2) {
                scale.value = withSpring(1);
            }
        });

    const composedGesture = Gesture.Simultaneous(pan, pinch);

    // Active Point Calculation
    const [activeIndex, setActiveIndex] = useState(-1);

    useDerivedValue(() => {
        if (touchX.value === -1) {
            runOnJS(setActiveIndex)(-1);
        } else {
            // Reverse calculate index from touchX
            // touchX = padding + (index / length) * (width - 2*padding)
            const fraction = (touchX.value - padding) / (width - padding * 2);
            let rawIndex = Math.round(fraction * (activeData.length - 1));
            rawIndex = Math.max(0, Math.min(rawIndex, activeData.length - 1));

            if (activeIndex !== rawIndex) {
                runOnJS(setActiveIndex)(rawIndex);
            }
        }
    });

    const activePoint = activeIndex !== -1 && activeIndex < activeData.length ? activeData[activeIndex] : null;

    // Tooltip positioning
    const tooltipStyle = useAnimatedStyle(() => {
        if (activeIndex === -1 || activeIndex >= activeData.length || !activeData[activeIndex]) {
            return {
                opacity: 0,
                transform: [{ translateY: 10 }]
            };
        }

        const point = activeData[activeIndex];
        const rawX = padding + (activeIndex / Math.max(1, pathInfo.length - 1)) * (width - padding * 2);
        const rawY = height - padding - ((point.value - pathInfo.minVal) / pathInfo.range) * (height - padding * 2);

        // Keep tooltip inside bounds
        const xPos = Math.max(50, Math.min(rawX, width - 50));

        return {
            opacity: withTiming(isVisible.value),
            transform: [
                { translateX: xPos - 50 },
                { translateY: rawY - 45 }
            ]
        };
    }, [activeIndex, activeData, pathInfo, width, height, isVisible]);

    const activeDotStyle = useAnimatedStyle(() => {
        if (activeIndex === -1 || activeIndex >= activeData.length || !activeData[activeIndex]) {
            return { opacity: 0 };
        }
        const point = activeData[activeIndex];
        const rawX = padding + (activeIndex / Math.max(1, pathInfo.length - 1)) * (width - padding * 2);
        const rawY = height - padding - ((point.value - pathInfo.minVal) / pathInfo.range) * (height - padding * 2);

        return {
            opacity: withTiming(isVisible.value),
            transform: [
                { translateX: rawX - 8 },
                { translateY: rawY - 8 }
            ]
        };
    }, [activeIndex, activeData, pathInfo, width, height, isVisible]);

    const scrubLineStyle = useAnimatedStyle(() => {
        if (activeIndex === -1 || activeIndex >= activeData.length || !activeData[activeIndex]) {
            return { opacity: 0 };
        }

        return {
            left: padding + (activeIndex / Math.max(1, pathInfo.length - 1)) * (width - padding * 2),
            opacity: withTiming(isVisible.value * 0.3)
        };
    }, [activeIndex, pathInfo, width, isVisible, activeData]);

    return (
        <View style={styles.container}>
            {/* Header Text (Shows mode) */}
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: textColor }]}>
                    {isDaily ? "Daily Expenses (Zoomed In)" : "Monthly Trend"}
                </Text>
                <Text style={{ color: color, fontSize: 12, fontWeight: 'bold' }}>
                    {isDaily ? "Pinch to zoom out" : "Pinch to zoom in"}
                </Text>
            </View>

            <GestureDetector gesture={composedGesture}>
                <View style={{ width, height }}>
                    <Canvas style={{ flex: 1 }}>
                        {pathInfo.fillPath && (
                            <Path path={pathInfo.fillPath}>
                                <LinearGradient
                                    start={vec(0, 0)}
                                    end={vec(0, height)}
                                    colors={[`${color}60`, `${color}00`]}
                                />
                            </Path>
                        )}
                        {pathInfo.strokePath && (
                            <Path
                                path={pathInfo.strokePath}
                                style="stroke"
                                strokeWidth={3}
                                color={color}
                            />
                        )}
                    </Canvas>

                    {/* Active Scrubbing Scrim / Line */}
                    <Animated.View style={[
                        styles.scrubLine,
                        {
                            height: height,
                            backgroundColor: color
                        },
                        scrubLineStyle
                    ]} />

                    {/* Active Dot */}
                    <Animated.View style={[styles.activeDot, { backgroundColor: color }, activeDotStyle]} />

                    {/* Floating Tooltip */}
                    <Animated.View style={[styles.tooltip, tooltipStyle, { backgroundColor: '#212529', borderColor: color }]}>
                        <Text style={styles.tooltipDate}>{activePoint?.fullDate || activePoint?.label || ''}</Text>
                        <Text style={styles.tooltipValue}>${activePoint?.value != null ? activePoint.value.toFixed(2) : '0.00'}</Text>
                    </Animated.View>
                </View>
            </GestureDetector>

            {/* Static X Axis labels if not scrubbing */}
            <View style={styles.axisRow}>
                <Text style={[styles.axisText, { color: textColor }]}>{activeData[0].label}</Text>
                {/* Middle label */}
                <Text style={[styles.axisText, { color: textColor }]}>{activeData[Math.floor(activeData.length / 2)].label}</Text>
                <Text style={[styles.axisText, { color: textColor }]}>{activeData[activeData.length - 1].label}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    headerRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        opacity: 0.8
    },
    scrubLine: {
        position: 'absolute',
        width: 1,
        top: 0,
        opacity: 0.3,
    },
    activeDot: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#FFF',
        top: 0,
        left: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    tooltip: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 100,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    tooltipDate: {
        color: '#ADB5BD',
        fontSize: 10,
        marginBottom: 2,
    },
    tooltipValue: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
    },
    axisRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: 8,
        opacity: 0.5,
    },
    axisText: {
        fontSize: 10,
    }
});
