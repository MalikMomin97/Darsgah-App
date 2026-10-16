import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { IconCircle } from '../../components/common/IconCircle';
import { FadeInView } from '../../components/common/Motion';
import { Colors, Spacing, Typography, Fonts, BorderRadius, Shadows } from '../../config/theme';
import { useAppNavigation } from '../../navigation/appNavigation';

const APP_ICON = require('../../../assets/icon.png');

const FEATURES: {
  icon: React.ComponentProps<typeof IconCircle>['icon'];
  title: string;
  text: string;
  color: string;
  bg: string;
}[] = [
  {
    icon: 'people-outline',
    title: 'Students & Groups',
    text: 'Register students, organise them into groups and keep their records in one place.',
    color: Colors.primary,
    bg: Colors.primaryLight,
  },
  {
    icon: 'calendar-outline',
    title: 'Daily Attendance',
    text: 'Mark present or absent in seconds. Days the darsgah is off never affect attendance.',
    color: Colors.present,
    bg: Colors.presentBg,
  },
  {
    icon: 'library-outline',
    title: 'Curriculum & Daily Sabak',
    text: 'Qaida, Quran paras, all 114 surahs and Diniyat books, with daily lesson ratings.',
    color: Colors.accentDark,
    bg: Colors.accentLight,
  },
  {
    icon: 'stats-chart-outline',
    title: 'Monthly Reports',
    text: 'Student and group reports with attendance and learning progress, shared as PDF.',
    color: Colors.info,
    bg: Colors.infoLight,
  },
];

export const AboutScreen: React.FC = () => {
  const navigation = useAppNavigation();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.container}>
      <Header title="About Us" onBack={() => navigation.goBack()} />

      <ScreenContainer scrollable contentContainerStyle={styles.content}>
        {/* App identity */}
        <FadeInView style={styles.hero}>
          <Image source={APP_ICON} style={styles.appIcon} accessibilityIgnoresInvertColors />
          <Text style={styles.appName}>Darsgah Tracker</Text>
          <Text style={styles.tagline}>Madrasa management, made simple</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>Version {version}</Text>
          </View>
        </FadeInView>

        {/* About */}
        <FadeInView index={1}>
          <Text style={styles.groupLabel}>About the App</Text>
          <Card>
            <Text style={styles.body}>
              Darsgah Tracker helps teachers of a maktab or madrasa run their classes: students,
              groups, daily attendance, the Qaida → Quran → Hifz curriculum, daily sabak and monthly
              reports for parents, all from one phone.
            </Text>
          </Card>
        </FadeInView>

        {/* Features */}
        <FadeInView index={2}>
          <Text style={styles.groupLabel}>What You Can Do</Text>
          <Card padding="xs">
            {FEATURES.map((f, i) => (
              <View key={f.title} style={[styles.featureRow, i > 0 && styles.featureDivider]}>
                <IconCircle icon={f.icon} color={f.color} bg={f.bg} size={40} square />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.text}</Text>
                </View>
              </View>
            ))}
          </Card>
        </FadeInView>

        {/* Privacy */}
        <FadeInView index={3}>
          <Text style={styles.groupLabel}>Your Data</Text>
          <Card style={styles.privacyCard}>
            <IconCircle icon="shield-checkmark-outline" size={40} />
            <Text style={[styles.body, styles.privacyText]}>
              Works fully offline. All records stay on this device; nothing is uploaded. Use Backup
              & Restore in Settings to keep a copy safe.
            </Text>
          </Card>
        </FadeInView>

        {/* Credits */}
        <FadeInView index={4} style={styles.footer}>
          <View style={styles.footerRule} />
          <Text style={styles.footerLabel}>Developed by</Text>
          <Text style={styles.footerName}>Khadim e Andrabia</Text>
          <View style={styles.footerHeart}>
            <Ionicons name="heart" size={12} color={Colors.accent} />
            <Text style={styles.footerSmall}>Made for the students of the darsgah</Text>
          </View>
        </FadeInView>
      </ScreenContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xxxl * 2,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  appIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  appName: {
    ...Typography.display,
  },
  tagline: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  versionPill: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  versionText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: Colors.primary,
  },
  groupLabel: {
    ...Typography.overline,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  body: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  featureDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.titleSmall,
    fontSize: 15,
  },
  featureDesc: {
    ...Typography.bodySmall,
    marginTop: 2,
    lineHeight: 18,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  privacyText: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xxxl,
  },
  footerRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginBottom: Spacing.lg,
  },
  footerLabel: {
    ...Typography.overline,
  },
  footerName: {
    ...Typography.titleMedium,
    color: Colors.primary,
    marginTop: 4,
  },
  footerHeart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.sm,
  },
  footerSmall: {
    ...Typography.caption,
  },
});
