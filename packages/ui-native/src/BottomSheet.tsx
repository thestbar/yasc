import React, { useEffect, useRef } from 'react'
import { View, Text, Modal, TouchableOpacity, Animated, StyleSheet, Pressable } from 'react-native'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapHeight?: number
}

export function BottomSheet({ visible, onClose, title, children, snapHeight = 400 }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(snapHeight)).current

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : snapHeight,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [visible, snapHeight, translateY])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, { height: snapHeight, transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        {title && <Text style={styles.title}>{title}</Text>}
        {children}
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 32 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 8, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginVertical: 12 },
})
