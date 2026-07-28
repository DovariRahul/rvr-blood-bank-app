import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList, SafeAreaView, useWindowDimensions, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../store/hooks';
import adminService from '../services/admin.service';
import api from '../services/api';
import Colors from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import Alert from '../utils/alert';
import ToastBanner from '../components/ToastBanner';

export default function PublicHomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTabletOrWeb = width >= 768;
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [donors, setDonors] = useState([]);
  const [loadingDonors, setLoadingDonors] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Intercept authentication modal
  const [authPromptVisible, setAuthPromptVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'request' or 'donor'

  // Group default counts
  const [groupCounts, setGroupCounts] = useState({
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
    'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0
  });

  useEffect(() => {
    loadPublicStats();
  }, []);

  const loadPublicStats = async () => {
    try {
      setLoadingStats(true);
      const res = await adminService.getPublicStats();
      setStats(res.data);
      
      if (res.data.blood_group_availability) {
        const counts = { ...groupCounts };
        res.data.blood_group_availability.forEach(item => {
          counts[item.blood_group] = item.available_count;
        });
        setGroupCounts(counts);
      }
    } catch (err) {
      console.warn('Failed to load stats:', err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleGroupClick = async (group) => {
    setSelectedGroup(group);
    setModalVisible(true);
    setLoadingDonors(true);
    try {
      const res = await api.get(`/stats/public/donors?blood_group=${encodeURIComponent(group)}`);
      setDonors(res.data.data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load registered donors list.');
    } finally {
      setLoadingDonors(false);
    }
  };

  const handleActionClick = (action) => {
    if (isAuthenticated) {
      if (action === 'request') {
        router.push('/(requester)/request-blood');
      } else if (action === 'donor') {
        router.push('/(donor)/availability');
      }
    } else {
      setPendingAction(action);
      setAuthPromptVisible(true);
    }
  };

  const handleAuthPromptChoice = (choice) => {
    setAuthPromptVisible(false);
    if (choice === 'login') {
      router.push('/(auth)/login');
    } else if (choice === 'register') {
      router.push('/(auth)/register');
    }
  };

  const navigateToRoleHome = () => {
    if (user?.role === 'admin') {
      router.push('/(admin)/dashboard');
    } else if (user?.role === 'donor') {
      router.push('/(donor)/home');
    } else {
      router.push('/(requester)/home');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <ToastBanner />
        
        {/* Navbar */}
        <View style={styles.navbarOuter}>
          <View style={styles.navbarInner}>
            <TouchableOpacity onPress={() => router.push('/')} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.navLogo}>🩸 RVR BLOOD BANK</Text>
            </TouchableOpacity>
            <View style={styles.navActions}>
              {isTabletOrWeb && (
                <>
                  <TouchableOpacity style={styles.navLink} onPress={() => handleActionClick('request')}>
                    <Text style={styles.navLinkText}>Request Blood</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.navLink} onPress={() => handleActionClick('donor')}>
                    <Text style={styles.navLinkText}>Become a Donor</Text>
                  </TouchableOpacity>
                </>
              )}
              {isAuthenticated ? (
                <TouchableOpacity style={styles.dashboardBtn} onPress={navigateToRoleHome}>
                  <Text style={styles.dashboardBtnText}>Dashboard</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(auth)/login')}>
                    <Text style={styles.navBtnText}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.navBtn, styles.navBtnPrimary]} onPress={() => router.push('/(auth)/register')}>
                    <Text style={styles.navBtnPrimaryText}>Sign Up</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={[styles.heroSection, { paddingVertical: isTabletOrWeb ? 64 : 24 }]}>
          <View style={[styles.heroSectionInner, { flexDirection: isTabletOrWeb ? 'row' : 'column' }]}>
            <View style={[styles.heroLeft, { width: isTabletOrWeb ? '50%' : '100%', marginBottom: isTabletOrWeb ? 0 : 24, paddingRight: isTabletOrWeb ? 32 : 0 }]}>
              <View style={styles.pillBadge}>
                <Ionicons name="heart-outline" size={14} color={Colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.pillText}>Emergency Blood Matching Platform</Text>
              </View>
              <Text style={styles.heroHeading}>
                Every Drop{'\n'}
                <Text style={styles.heroHeadingOrange}>Saves a Life</Text>
              </Text>
              <Text style={styles.heroParagraph}>
                RVR Blood Bank connects blood seekers with registered donors instantly during medical emergencies. Our real-time matching and SMS notification system reduces donor-finding time dramatically.
              </Text>
              
              <View style={styles.heroButtonsContainer}>
                <TouchableOpacity style={styles.heroBtnRequest} onPress={() => handleActionClick('request')}>
                  <Ionicons name="water" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.heroBtnTextWhite}>Request Blood</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroBtnBecome} onPress={() => handleActionClick('donor')}>
                  <Ionicons name="heart-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.heroBtnTextOrange}>Become a Donor</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Right Floating Stat Cards (Visual highlight from desktop UI) */}
            <View style={[styles.heroRight, { width: isTabletOrWeb ? '45%' : '100%', marginTop: isTabletOrWeb ? 0 : 10 }]}>
              <View style={styles.floatingCardWhite}>
                <Ionicons name="water" size={28} color={Colors.error} />
                <View style={styles.cardLine} />
                <Text style={styles.floatingCardNumberDark}>{stats?.total_donors || 0}</Text>
                <Text style={styles.floatingCardTextDark}>Registered Donors</Text>
              </View>

              <View style={styles.floatingCardOrange}>
                <Ionicons name="pulse" size={28} color="#fff" />
                <View style={styles.cardLineWhite} />
                <Text style={styles.floatingCardNumberLight}>{stats?.total_requests || 0}</Text>
                <Text style={styles.floatingCardTextLight}>Total Requests</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Impact Counters Ribbon (Dark Banner) */}
        <View style={styles.impactRibbon}>
          {loadingStats ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.ribbonInner}>
              <View style={styles.ribbonItem}>
                <Ionicons name="people-outline" size={24} color={Colors.primary} />
                <Text style={styles.ribbonNum}>{stats?.total_donors || 0}</Text>
                <Text style={styles.ribbonLabel}>Registered Donors</Text>
              </View>

              <View style={styles.ribbonItem}>
                <Ionicons name="heart-outline" size={24} color={Colors.error} />
                <Text style={styles.ribbonNum}>{stats?.total_requests || 0}</Text>
                <Text style={styles.ribbonLabel}>Total Blood Requests</Text>
              </View>

              <View style={styles.ribbonItem}>
                <Ionicons name="pulse-outline" size={24} color="#00E676" />
                <Text style={styles.ribbonNum}>{stats?.lives_saved || 0}</Text>
                <Text style={styles.ribbonLabel}>Lives Saved</Text>
              </View>
            </View>
          )}
        </View>

        {/* How It Works Section */}
        <View style={styles.sectionWorks}>
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>How It Works</Text>
            <Text style={styles.sectionSub}>Three simple steps to get the blood you need</Text>

            <View style={[styles.stepsRowContainer, { flexDirection: isTabletOrWeb ? 'row' : 'column', justifyContent: 'space-between' }]}>
              <View style={[styles.stepBox, isTabletOrWeb && { width: '31%', marginBottom: 0 }]}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
                <View style={styles.stepIconCircleRed}>
                  <Ionicons name="water" size={24} color={Colors.error} />
                </View>
                <Text style={styles.stepTitleText}>Submit Request</Text>
                <Text style={styles.stepDescText}>Fill out the blood request form with patient details, blood group needed, and hospital information.</Text>
              </View>

              <View style={[styles.stepBox, isTabletOrWeb && { width: '31%', marginBottom: 0 }]}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
                <View style={styles.stepIconCircleOrange}>
                  <Ionicons name="notifications" size={24} color={Colors.primary} />
                </View>
                <Text style={styles.stepTitleText}>Donors Notified</Text>
                <Text style={styles.stepDescText}>Our matching engine finds compatible donors nearby and sends SMS notifications instantly.</Text>
              </View>

              <View style={[styles.stepBox, isTabletOrWeb && { width: '31%', marginBottom: 0 }]}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
                <View style={styles.stepIconCircleGreen}>
                  <Ionicons name="bicycle" size={24} color="#2E7D32" />
                </View>
                <Text style={styles.stepTitleText}>Blood Delivered</Text>
                <Text style={styles.stepDescText}>Accepted donors visit the hospital to donate. Track the entire process in real time.</Text>
              </View>
            </View>
          </View>
        </View>



        {/* Features Row */}
        <View style={styles.featuresSection}>
          <View style={[styles.featuresInnerGrid, { flexDirection: isTabletOrWeb ? 'row' : 'column', justifyContent: 'space-between', flexWrap: 'wrap' }]}>
            <View style={[styles.featureCard, isTabletOrWeb && { width: '23.5%', marginBottom: 0 }]}>
              <Ionicons name="time" size={24} color={Colors.primary} />
              <Text style={styles.featureHeader}>Instant Matching</Text>
              <Text style={styles.featureParagraph}>Our algorithm finds compatible donors within seconds, not hours.</Text>
            </View>

            <View style={[styles.featureCard, isTabletOrWeb && { width: '23.5%', marginBottom: 0 }]}>
              <Ionicons name="notifications" size={24} color={Colors.primary} />
              <Text style={styles.featureHeader}>SMS Notifications</Text>
              <Text style={styles.featureParagraph}>Donors receive real-time SMS alerts — no app download required.</Text>
            </View>

            <View style={[styles.featureCard, isTabletOrWeb && { width: '23.5%', marginBottom: 0 }]}>
              <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
              <Text style={styles.featureHeader}>Verified Donors</Text>
              <Text style={styles.featureParagraph}>All donors are verified and eligibility-checked before matching.</Text>
            </View>

            <View style={[styles.featureCard, isTabletOrWeb && { width: '23.5%', marginBottom: 0 }]}>
              <Ionicons name="pulse" size={24} color={Colors.primary} />
              <Text style={styles.featureHeader}>Real-Time Tracking</Text>
              <Text style={styles.featureParagraph}>Track your request status from submission to fulfillment.</Text>
            </View>
          </View>
        </View>

        {/* Orange Call To Action Banner */}
        <View style={styles.ctaBanner}>
          <View style={styles.ctaInner}>
            <Text style={styles.ctaHeading}>Ready to Save Lives?</Text>
            <Text style={styles.ctaSubtitle}>Join our community of heroes. Register as a donor today and be the reason someone gets another chance at life.</Text>
            <View style={[styles.ctaButtonsRow, { justifyContent: 'center' }]}>
              <TouchableOpacity style={[styles.ctaBtnWhite, isTabletOrWeb && { width: 240, marginHorizontal: 12 }]} onPress={() => handleActionClick('donor')}>
                <Ionicons name="heart-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.ctaBtnTextOrange}>Register as Donor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.ctaBtnOutlined, isTabletOrWeb && { width: 240, marginHorizontal: 12 }]} onPress={() => handleActionClick('request')}>
                <Text style={styles.ctaBtnTextWhite}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <View style={styles.footerInner}>
            <View style={[styles.footerGrid, { flexDirection: isTabletOrWeb ? 'row' : 'column' }]}>
              <View style={[styles.footerBrandCol, isTabletOrWeb && { width: '30%', marginBottom: 0 }]}>
                <Text style={styles.footerBrandTitle}>🩸 RVR BLOOD BANK</Text>
                <Text style={styles.footerBrandDesc}>Connecting blood seekers with registered donors instantly during medical emergencies. Every drop saves a life.</Text>
              </View>

              <View style={[styles.footerLinksCol, isTabletOrWeb && { width: '20%', marginBottom: 0 }]}>
                <Text style={styles.footerColHeader}>QUICK LINKS</Text>
                <TouchableOpacity onPress={() => handleActionClick('request')}><Text style={styles.footerLink}>Request Blood</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleActionClick('donor')}><Text style={styles.footerLink}>Become a Donor</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}><Text style={styles.footerLink}>Login</Text></TouchableOpacity>
              </View>

              <View style={[styles.footerGroupsCol, isTabletOrWeb && { width: '25%', marginBottom: 0 }]}>
                <Text style={styles.footerColHeader}>BLOOD GROUPS</Text>
                <View style={styles.footerBadgeGrid}>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(grp => (
                    <TouchableOpacity key={grp} style={styles.footerGroupBadge} onPress={() => handleGroupClick(grp)}>
                      <Text style={styles.footerBadgeText}>{grp}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.footerContactCol, isTabletOrWeb && { width: '20%', marginBottom: 0 }]}>
                <Text style={styles.footerColHeader}>CONTACT</Text>
                <Text style={styles.footerContactInfo}>✉️ raagasai6@gmail.com</Text>
                <Text style={styles.footerContactInfo}>📞 +91 9491659594</Text>
              </View>
            </View>

            <Text style={styles.copyrightText}>© 2026 RVR Blood Bank. Built with ❤️ for saving lives.</Text>
          </View>
        </View>

      </ScrollView>

      {/* Donors List Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registered Donors ({selectedGroup})</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingDonors ? (
              <ActivityIndicator color={Colors.primary} style={styles.modalLoader} />
            ) : donors.length > 0 ? (
              <FlatList
                data={donors}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.donorItem}>
                    <View style={styles.donorRow}>
                      <Ionicons name="person" size={18} color={Colors.primary} style={styles.donorIcon} />
                      <Text style={styles.donorName}>{item.name}</Text>
                    </View>
                    <View style={styles.donorRow}>
                      <Ionicons name="call" size={16} color={Colors.textSecondary} style={styles.donorIcon} />
                      <Text style={styles.donorVal}>{item.phone}</Text>
                    </View>
                    <View style={styles.donorRow}>
                      <Ionicons name="location" size={16} color={Colors.textSecondary} style={styles.donorIcon} />
                      <Text style={styles.donorVal}>{item.city}, {item.state}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={styles.donorList}
              />
            ) : (
              <View style={styles.emptyDonors}>
                <Text style={styles.emptyDonorsText}>No donors currently available for {selectedGroup}.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Intercept Authentication Prompt Modal */}
      <Modal visible={authPromptVisible} animationType="fade" transparent={true} onRequestClose={() => setAuthPromptVisible(false)}>
        <View style={styles.authPromptOverlay}>
          <View style={styles.authPromptContent}>
            <Ionicons name="lock-closed" size={48} color={Colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.authPromptTitle}>Authentication Required</Text>
            <Text style={styles.authPromptDesc}>
              To perform this action, please log in to your account or register a new one.
            </Text>

            <TouchableOpacity style={styles.authPromptBtnPrimary} onPress={() => handleAuthPromptChoice('login')}>
              <Text style={styles.authPromptBtnTextPrimary}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.authPromptBtnSecondary} onPress={() => handleAuthPromptChoice('register')}>
              <Text style={styles.authPromptBtnTextSecondary}>Sign Up / Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.authPromptBtnCancel} onPress={() => setAuthPromptVisible(false)}>
              <Text style={styles.authPromptBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
  },
  navbarOuter: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  navbarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  navLogo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLink: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
    justifyContent: 'center',
  },
  navLinkText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    justifyContent: 'center',
  },
  navBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  navBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  navBtnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dashboardBtn: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dashboardBtnText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },

  // ── Hero Section (White-Orange Premium Aesthetic) ──
  heroSection: {
    padding: 24,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
  },
  heroSectionInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroLeft: {
    marginBottom: 24,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  pillText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroHeading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    lineHeight: 40,
    marginBottom: 16,
  },
  heroHeadingOrange: {
    color: Colors.primary,
  },
  heroParagraph: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  heroButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  heroBtnRequest: {
    backgroundColor: Colors.error,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '48%',
  },
  heroBtnTextWhite: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  heroBtnBecome: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '48%',
  },
  heroBtnTextOrange: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  heroRight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingCardWhite: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  floatingCardOrange: {
    width: '48%',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardLine: {
    width: 32,
    height: 4,
    backgroundColor: '#1A1A2E',
    marginVertical: 12,
    borderRadius: 2,
  },
  cardLineWhite: {
    width: 32,
    height: 4,
    backgroundColor: '#fff',
    marginVertical: 12,
    borderRadius: 2,
  },
  floatingCardTextDark: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: 'bold',
  },
  floatingCardTextLight: {
    fontSize: 13,
    color: '#fff',
    fontWeight: 'bold',
  },
  floatingCardNumberDark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  floatingCardNumberLight: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },

  // ── Impact Ribbon (Dark Navy) ──
  impactRibbon: {
    backgroundColor: '#111625',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  ribbonInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  ribbonItem: {
    width: '31%',
    alignItems: 'center',
  },
  ribbonNum: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  ribbonLabel: {
    fontSize: 10,
    color: '#8E9AA8',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── How It Works Section ──
  sectionWorks: {
    padding: 24,
    backgroundColor: '#fff',
  },
  sectionInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  stepsRowContainer: {
    flexDirection: 'column',
  },
  stepBox: {
    alignItems: 'center',
    backgroundColor: '#FDFDFD',
    borderColor: '#F1F1F1',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  stepBadge: {
    backgroundColor: Colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepIconCircleRed: {
    backgroundColor: Colors.errorSoft,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepIconCircleOrange: {
    backgroundColor: '#FFF3E0',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepIconCircleGreen: {
    backgroundColor: '#E8F5E9',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  stepDescText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Blood Availability Grid ──
  availabilitySection: {
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  bloodGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bloodBoxCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderColor: '#E9ECEF',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 1,
  },
  bloodBoxName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.error,
  },
  bloodBoxCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },

  // ── Features Grid ──
  featuresSection: {
    padding: 24,
    backgroundColor: '#fff',
  },
  featuresInnerGrid: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  featureCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  featureHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginTop: 10,
    marginBottom: 6,
  },
  featureParagraph: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // ── CTA Orange Banner ──
  ctaBanner: {
    backgroundColor: Colors.primary,
    padding: 32,
    alignItems: 'center',
  },
  ctaInner: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  ctaHeading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: '#FFE0B2',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  ctaButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    flexWrap: 'wrap',
  },
  ctaBtnWhite: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginBottom: 12,
  },
  ctaBtnOutlined: {
    borderColor: '#fff',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginBottom: 12,
  },

  // ── Footer Section ──
  footerSection: {
    backgroundColor: '#111625',
    padding: 24,
  },
  footerInner: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  footerGrid: {
    justifyContent: 'space-between',
  },
  footerBrandCol: {
    marginBottom: 24,
  },
  footerBrandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  footerBrandDesc: {
    fontSize: 12,
    color: '#8E9AA8',
    lineHeight: 18,
  },
  footerLinksCol: {
    marginBottom: 24,
  },
  footerColHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  footerLink: {
    color: '#8E9AA8',
    fontSize: 13,
    marginBottom: 8,
  },
  footerGroupsCol: {
    marginBottom: 24,
  },
  footerBadgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footerGroupBadge: {
    backgroundColor: Colors.errorSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  footerBadgeText: {
    color: Colors.error,
    fontSize: 11,
    fontWeight: 'bold',
  },
  footerContactCol: {
    marginBottom: 30,
  },
  footerContactInfo: {
    color: '#8E9AA8',
    fontSize: 13,
    marginBottom: 6,
  },
  copyrightText: {
    fontSize: 11,
    color: '#53657D',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#242F41',
    paddingTop: 20,
  },

  // ── Modals Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  modalLoader: {
    marginTop: 40,
  },
  donorList: {
    paddingBottom: 20,
  },
  donorItem: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  donorIcon: {
    marginRight: 8,
  },
  donorName: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: 'bold',
  },
  donorVal: {
    color: '#495057',
    fontSize: 13,
  },
  emptyDonors: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDonorsText: {
    color: '#868E96',
    fontSize: 14,
    textAlign: 'center',
  },

  // ── Auth Prompt Modal (Interception) ──
  authPromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authPromptContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    elevation: 5,
  },
  authPromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  authPromptDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  authPromptBtnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  authPromptBtnTextPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  authPromptBtnSecondary: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  authPromptBtnTextSecondary: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  authPromptBtnCancel: {
    padding: 10,
  },
  authPromptBtnTextCancel: {
    color: '#868E96',
    fontSize: 14,
    fontWeight: '600',
  },
});
