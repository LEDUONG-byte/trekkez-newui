import React from 'react';
import { StyleSheet, View } from 'react-native';

interface VerticalConnectorProps {
    height?: number;
}

export default function VerticalConnector({ height = 36 }: VerticalConnectorProps) {
    return (
        <View style={styles.connectorContainer}>
            <View style={[styles.verticalDashedLine, { height }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    connectorContainer: {
        marginVertical: 1, // Bỏ margin dọc để đường nối dính sát vào trường trên và dưới
        paddingLeft: 0,
    },
    verticalDashedLine: {
        width: 1,
        borderLeftWidth: 1.5,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
    },
});