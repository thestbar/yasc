import React from 'react'
import { SectionList, SectionListProps, Text, View, StyleSheet } from 'react-native'

interface Section<T> {
  title: string
  data: T[]
}

interface SectionListWrapperProps<T> extends Omit<SectionListProps<T>, 'sections' | 'renderSectionHeader'> {
  sections: Section<T>[]
  renderSectionHeader?: (title: string) => React.ReactElement
}

export function SectionListWrapper<T>({
  sections,
  renderSectionHeader,
  ...props
}: SectionListWrapperProps<T>) {
  return (
    <SectionList
      {...props}
      sections={sections}
      keyExtractor={(item, index) => String(index)}
      renderSectionHeader={({ section }) =>
        renderSectionHeader ? (
          renderSectionHeader(section.title)
        ) : (
          <View style={styles.header}>
            <Text style={styles.headerText}>{section.title}</Text>
          </View>
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 6, backgroundColor: '#F9FAFB' },
  headerText: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
})
