import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'Home' | 'Check-In' | 'Trends' | 'Journal' | 'Profile';

const C = {
  ink: '#25342E', muted: '#718078', moss: '#487263', sage: '#DCEBE3',
  cream: '#F8F6F0', white: '#FFFFFF', lilac: '#EEE8F5', peach: '#F5E5DA', line: '#E7E9E3',
};

const nav: { label: Tab; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Home', icon: 'home-outline', active: 'home' },
  { label: 'Check-In', icon: 'heart-outline', active: 'heart' },
  { label: 'Trends', icon: 'stats-chart-outline', active: 'stats-chart' },
  { label: 'Journal', icon: 'book-outline', active: 'book' },
  { label: 'Profile', icon: 'person-outline', active: 'person' },
];

const moods = [
  { emoji: '😞', label: 'Heavy' }, { emoji: '😕', label: 'Low' },
  { emoji: '😌', label: 'Steady' }, { emoji: '🙂', label: 'Good' }, { emoji: '😊', label: 'Bright' },
];

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Header({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return <View style={styles.pageHeader}>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.pageTitle}>{title}</Text></View>;
}

function Home({ onCheckIn }: { onCheckIn: () => void }) {
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <View style={styles.topRow}>
      <View><Text style={styles.eyebrow}>MONDAY, JULY 28</Text><Text style={styles.greeting}>Good morning, Alex</Text></View>
      <Pressable accessibilityLabel="Notifications" style={styles.iconButton}><Ionicons name="notifications-outline" size={22} color={C.ink} /></Pressable>
    </View>
    <LinearGradient colors={['#DCEBE3', '#EDF3E9']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.hero}>
      <View style={styles.quoteMark}><Ionicons name="sparkles" size={18} color={C.moss}/></View>
      <Text style={styles.quote}>“You deserve the same compassion you offer everyone else.”</Text>
      <View style={styles.quoteActions}><Pressable style={styles.smallAction}><Ionicons name="heart-outline" size={18} color={C.moss}/><Text style={styles.smallActionText}>Save</Text></Pressable><Pressable style={styles.smallAction}><Ionicons name="share-outline" size={18} color={C.moss}/><Text style={styles.smallActionText}>Share</Text></Pressable></View>
    </LinearGradient>
    <Pressable onPress={onCheckIn} style={styles.checkinCard} accessibilityRole="button">
      <View style={styles.checkinIcon}><Ionicons name="heart" size={23} color={C.white}/></View>
      <View style={{flex:1}}><Text style={styles.checkinTitle}>How are you feeling?</Text><Text style={styles.checkinSub}>A gentle check-in takes about 2 minutes</Text></View>
      <View style={styles.arrow}><Ionicons name="arrow-forward" size={20} color={C.moss}/></View>
    </Pressable>
    <Text style={styles.sectionTitle}>Today at a glance</Text>
    <View style={styles.statusGrid}>
      <Card style={styles.statusCard}><View style={[styles.tintIcon,{backgroundColor:C.lilac}]}><Ionicons name="calendar-outline" size={20} color="#735B84"/></View><Text style={styles.statusValue}>Day 24</Text><Text style={styles.statusLabel}>Cycle day</Text></Card>
      <Card style={styles.statusCard}><View style={[styles.tintIcon,{backgroundColor:C.peach}]}><Ionicons name="medical-outline" size={20} color="#9A684C"/></View><Text style={styles.statusValue}>8:00 PM</Text><Text style={styles.statusLabel}>Medication</Text></Card>
    </View>
    <Card style={styles.appointment}><View style={styles.calendarDate}><Text style={styles.month}>AUG</Text><Text style={styles.day}>04</Text></View><View style={{flex:1}}><Text style={styles.cardLabel}>UPCOMING APPOINTMENT</Text><Text style={styles.appointmentTitle}>Dr. Maya Chen</Text><Text style={styles.statusLabel}>Tuesday · 10:30 AM</Text></View><Ionicons name="chevron-forward" size={20} color={C.muted}/></Card>
    <Text style={styles.sectionTitle}>Quick actions</Text>
    <View style={styles.quickRow}>{[
      ['add-circle-outline','Symptom'],['medical-outline','Medication'],['create-outline','Add note'],['stats-chart-outline','Trends']
    ].map(([icon,label])=><Pressable key={label} style={styles.quick}><View style={styles.quickIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={21} color={C.moss}/></View><Text style={styles.quickText}>{label}</Text></Pressable>)}</View>
    <Text style={styles.lastCheck}>Last check-in: Yesterday at 8:42 PM</Text>
  </ScrollView>;
}

function CheckIn() {
  const [mood, setMood] = useState(2); const [step, setStep] = useState(1); const [done, setDone] = useState(false);
  if (done) return <View style={styles.center}><View style={styles.doneIcon}><Ionicons name="checkmark" size={38} color={C.white}/></View><Text style={styles.doneTitle}>Check-in complete</Text><Text style={styles.doneText}>Thank you for taking a moment for yourself. Your story has been saved.</Text><Pressable style={styles.primary} onPress={()=>{setDone(false);setStep(1)}}><Text style={styles.primaryText}>Done</Text></Pressable></View>;
  return <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
    <Header eyebrow={`DAILY CHECK-IN · ${step} OF 6`} title={step === 1 ? 'How is your mood?' : step === 2 ? 'How did you sleep?' : step === 3 ? 'How is your energy?' : step === 4 ? 'Any symptoms today?' : step === 5 ? 'Medication check' : 'A moment to reflect'} />
    <View style={styles.progress}><View style={[styles.progressFill,{width:`${step/6*100}%`}]} /></View>
    {step === 1 ? <Card style={styles.questionCard}><Text style={styles.questionHint}>Choose what feels closest. There’s no wrong answer.</Text><View style={styles.moods}>{moods.map((item,i)=><Pressable key={item.label} onPress={()=>setMood(i)} style={[styles.mood, mood===i&&styles.moodSelected]}><Text style={styles.emoji}>{item.emoji}</Text><Text style={[styles.moodLabel,mood===i&&styles.moodLabelSelected]}>{item.label}</Text></Pressable>)}</View></Card>
    : step === 6 ? <Card style={styles.questionCard}><Text style={styles.prompt}>What helped today?</Text><TextInput multiline placeholder="A small win, a kind moment, or anything at all…" placeholderTextColor="#9AA49E" style={styles.input}/><Text style={styles.optional}>Optional · Your words stay private</Text></Card>
    : <Card style={styles.questionCard}><View style={styles.bigChoice}><Ionicons name={step===2?'moon-outline':step===3?'flash-outline':step===4?'body-outline':'medical-outline'} size={42} color={C.moss}/></View><Text style={styles.prompt}>{step===2?'Restful, restless, or somewhere between?':step===3?'Notice what your body is telling you.':step===4?'Select symptoms you want to remember.':'Did you take your medication as planned?'}</Text><View style={styles.pills}>{['Not today','A little','About average','A lot'].map(x=><Pressable key={x} style={styles.pill}><Text style={styles.pillText}>{x}</Text></Pressable>)}</View></Card>}
    <View style={styles.checkButtons}><Pressable onPress={()=>step>1&&setStep(step-1)} style={styles.back}><Ionicons name="arrow-back" size={20} color={C.moss}/></Pressable><Pressable style={styles.primary} onPress={()=>step<6?setStep(step+1):setDone(true)}><Text style={styles.primaryText}>{step===6?'Save check-in':'Continue'}</Text><Ionicons name="arrow-forward" size={19} color={C.white}/></Pressable></View>
    <Pressable onPress={()=>step<6?setStep(step+1):setDone(true)}><Text style={styles.skip}>Skip for now</Text></Pressable>
  </ScrollView>;
}

function Trends() { return <ScrollView contentContainerStyle={styles.scroll}><Header eyebrow="YOUR PATTERNS" title="Trends"/><Text style={styles.intro}>A gentle look at your last 7 days.</Text><Card><View style={styles.chartHead}><View><Text style={styles.cardLabel}>MOOD</Text><Text style={styles.appointmentTitle}>Mostly steady</Text></View><View style={styles.positive}><Text style={styles.positiveText}>↑ 12%</Text></View></View><View style={styles.chart}>{[42,58,50,72,64,78,69].map((h,i)=><View key={i} style={styles.barWrap}><View style={[styles.bar,{height:h}]} /><Text style={styles.barLabel}>{['M','T','W','T','F','S','S'][i]}</Text></View>)}</View></Card><Card><Text style={styles.cardLabel}>A PATTERN WORTH NOTICING</Text><Text style={styles.insight}>Your mood has felt more steady on days you logged 7+ hours of sleep.</Text><Text style={styles.disclaimer}>This is an observation from your entries, not medical advice.</Text></Card></ScrollView> }

function Journal() { return <ScrollView contentContainerStyle={styles.scroll}><Header eyebrow="YOUR PRIVATE SPACE" title="Journal"/><Pressable style={styles.newEntry}><Ionicons name="add" size={22} color={C.white}/><Text style={styles.primaryText}>New reflection</Text></Pressable>{['What helped today?','What do you need tomorrow?','A small moment I want to remember'].map((t,i)=><Card key={t}><Text style={styles.cardLabel}>{['TODAY','YESTERDAY','JULY 25'][i]}</Text><Text style={styles.appointmentTitle}>{t}</Text><Text style={styles.journalText}>{['A quiet cup of tea and a walk after dinner helped me reset.','More rest, fewer expectations, and a little patience.','The baby smiled at me during our morning feed.'][i]}</Text></Card>)}</ScrollView> }

function Profile() { return <ScrollView contentContainerStyle={styles.scroll}><Header title="Your space"/><View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View><Text style={styles.profileName}>Alex Morgan</Text><Text style={styles.statusLabel}>Your data belongs to you</Text></View>{[['lock-closed-outline','Privacy & data'],['document-text-outline','Export health story'],['accessibility-outline','Accessibility'],['moon-outline','Appearance'],['heart-circle-outline','Safety resources']].map(([i,t])=><Pressable key={t} style={styles.setting}><View style={styles.tintIcon}><Ionicons name={i as keyof typeof Ionicons.glyphMap} size={20} color={C.moss}/></View><Text style={styles.settingText}>{t}</Text><Ionicons name="chevron-forward" size={19} color={C.muted}/></Pressable>)}<Text style={styles.disclaimer}>Symptom Story does not diagnose, screen for, or treat health conditions. If you need urgent help, contact local emergency services.</Text></ScrollView> }

function Safety({ onClose }: { onClose: () => void }) {
  return <ScrollView contentContainerStyle={styles.scroll} accessibilityLiveRegion="polite">
    <Pressable accessibilityRole="button" accessibilityLabel="Close Support and Safety" onPress={onClose} style={styles.back}><Ionicons name="close" size={23} color={C.moss}/></Pressable>
    <Header eyebrow="SUPPORT AND SAFETY" title="You deserve human support" />
    <Card style={{backgroundColor:'#EDF3E9'}}><Text style={styles.insight}>If you may act on thoughts of harming yourself or someone else, cannot remain safe, or feel severely disoriented, seek immediate help now.</Text><Text style={styles.journalText}>Contact local emergency services or go to the nearest emergency department. If possible, tell a trusted support person what is happening and ask them to stay with you.</Text></Card>
    <Card><Text style={styles.cardLabel}>CRISIS RESOURCES</Text><Text style={styles.appointmentTitle}>Resource directory not configured</Text><Text style={styles.journalText}>Verified regional crisis resources must be configured before real-world use. Symptom Story does not provide an unverified phone number.</Text></Card>
    <Text style={styles.disclaimer}>This is a static safety message, not a diagnosis or an AI-generated response. You can leave this screen at any time.</Text>
  </ScrollView>;
}

export default function App() {
  const [tab,setTab]=useState<Tab>('Home'); const [showSafety,setShowSafety]=useState(false); const {width}=useWindowDimensions(); const maxWidth=useMemo(()=>Math.min(width,520),[width]);
  return <View style={styles.shell}><SafeAreaView style={[styles.app,{maxWidth}]} edges={['top']}>
    <View style={styles.content}>{showSafety?<Safety onClose={()=>setShowSafety(false)}/>:tab==='Home'?<Home onCheckIn={()=>setTab('Check-In')}/>:tab==='Check-In'?<CheckIn/>:tab==='Trends'?<Trends/>:tab==='Journal'?<Journal/>:<Profile/>}</View>
    {!showSafety&&<Pressable accessibilityRole="button" accessibilityLabel="Open Support and Safety" onPress={()=>setShowSafety(true)} style={styles.safetyButton}><Ionicons name="shield-checkmark-outline" size={21} color={C.moss}/><Text style={styles.safetyButtonText}>Support</Text></Pressable>}
    <View style={styles.nav}>{nav.map(item=>{const active=tab===item.label;return <Pressable key={item.label} onPress={()=>setTab(item.label)} style={styles.navItem} accessibilityRole="tab" accessibilityState={{selected:active}}><Ionicons name={active?item.active:item.icon} size={22} color={active?C.moss:'#89938D'}/><Text style={[styles.navText,active&&styles.navActive]}>{item.label}</Text></Pressable>})}</View>
  </SafeAreaView></View>;
}

const styles = StyleSheet.create({
  shell:{flex:1,backgroundColor:'#E9ECE8',alignItems:'center'},app:{flex:1,width:'100%',backgroundColor:C.cream,shadowColor:'#24352F',shadowOpacity:.12,shadowRadius:30},content:{flex:1},safetyButton:{position:'absolute',right:16,bottom:86,minWidth:96,height:48,paddingHorizontal:14,borderRadius:24,backgroundColor:C.white,borderWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,shadowColor:C.ink,shadowOpacity:.12,shadowRadius:8},safetyButtonText:{fontSize:13,fontWeight:'800',color:C.moss},scroll:{padding:20,paddingBottom:34,gap:16},topRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:2},eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.4,color:C.moss,marginBottom:6},greeting:{fontSize:26,fontWeight:'700',letterSpacing:-.6,color:C.ink},iconButton:{width:44,height:44,borderRadius:22,backgroundColor:C.white,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line},hero:{borderRadius:24,padding:22,minHeight:180,justifyContent:'space-between'},quoteMark:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,.65)',alignItems:'center',justifyContent:'center'},quote:{fontSize:21,lineHeight:29,fontWeight:'600',color:C.ink,letterSpacing:-.25},quoteActions:{flexDirection:'row',gap:20},smallAction:{flexDirection:'row',alignItems:'center',gap:6},smallActionText:{fontSize:13,color:C.moss,fontWeight:'700'},checkinCard:{backgroundColor:C.moss,borderRadius:20,padding:16,flexDirection:'row',alignItems:'center',gap:13},checkinIcon:{width:44,height:44,borderRadius:15,backgroundColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'},checkinTitle:{color:C.white,fontSize:17,fontWeight:'700',marginBottom:3},checkinSub:{color:'#D9E7E0',fontSize:12.5},arrow:{width:36,height:36,borderRadius:18,backgroundColor:C.white,alignItems:'center',justifyContent:'center'},sectionTitle:{fontSize:18,fontWeight:'700',color:C.ink,marginTop:4},card:{backgroundColor:C.white,borderRadius:19,padding:17,borderWidth:1,borderColor:C.line,shadowColor:'#34473F',shadowOpacity:.035,shadowRadius:10,shadowOffset:{width:0,height:4},gap:6},statusGrid:{flexDirection:'row',gap:12},statusCard:{flex:1},tintIcon:{width:38,height:38,borderRadius:12,backgroundColor:C.sage,alignItems:'center',justifyContent:'center',marginBottom:8},statusValue:{fontSize:19,fontWeight:'700',color:C.ink},statusLabel:{fontSize:13,color:C.muted},appointment:{flexDirection:'row',alignItems:'center',gap:14},calendarDate:{width:51,height:55,borderRadius:13,backgroundColor:C.peach,alignItems:'center',justifyContent:'center'},month:{fontSize:9,fontWeight:'800',color:'#9A684C'},day:{fontSize:20,fontWeight:'800',color:C.ink},cardLabel:{fontSize:10,fontWeight:'800',letterSpacing:1.1,color:C.moss},appointmentTitle:{fontSize:16,fontWeight:'700',color:C.ink,marginVertical:2},quickRow:{flexDirection:'row',justifyContent:'space-between'},quick:{alignItems:'center',width:'23%',gap:7},quickIcon:{width:48,height:48,borderRadius:16,backgroundColor:C.white,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},quickText:{fontSize:11.5,color:C.ink,fontWeight:'600'},lastCheck:{fontSize:12,color:C.muted,textAlign:'center',marginTop:5},nav:{height:76,flexDirection:'row',backgroundColor:C.white,borderTopWidth:1,borderColor:C.line,paddingTop:9,paddingBottom:7},navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:4},navText:{fontSize:10,color:'#89938D',fontWeight:'600'},navActive:{color:C.moss,fontWeight:'800'},pageHeader:{marginTop:5},pageTitle:{fontSize:30,fontWeight:'700',color:C.ink,letterSpacing:-.7},progress:{height:6,borderRadius:4,backgroundColor:'#E2E7E2',overflow:'hidden'},progressFill:{height:'100%',backgroundColor:C.moss,borderRadius:4},questionCard:{padding:20,minHeight:280,justifyContent:'center'},questionHint:{fontSize:14,color:C.muted,textAlign:'center',marginBottom:18},moods:{flexDirection:'row',justifyContent:'space-between'},mood:{alignItems:'center',paddingVertical:12,paddingHorizontal:4,borderRadius:16,gap:8,minWidth:52},moodSelected:{backgroundColor:C.sage},emoji:{fontSize:31},moodLabel:{fontSize:11,color:C.muted,fontWeight:'600'},moodLabelSelected:{color:C.moss,fontWeight:'800'},checkButtons:{flexDirection:'row',gap:12,marginTop:5},back:{width:54,height:54,borderRadius:18,borderWidth:1,borderColor:C.line,backgroundColor:C.white,alignItems:'center',justifyContent:'center'},primary:{height:54,borderRadius:18,backgroundColor:C.moss,flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingHorizontal:24},primaryText:{fontSize:15,color:C.white,fontWeight:'700'},skip:{textAlign:'center',color:C.muted,fontSize:13,fontWeight:'600',padding:6},bigChoice:{width:82,height:82,borderRadius:28,alignSelf:'center',backgroundColor:C.sage,alignItems:'center',justifyContent:'center',marginBottom:12},prompt:{fontSize:20,lineHeight:28,textAlign:'center',fontWeight:'700',color:C.ink},pills:{flexDirection:'row',flexWrap:'wrap',gap:9,justifyContent:'center',marginTop:18},pill:{paddingVertical:10,paddingHorizontal:14,borderRadius:99,backgroundColor:C.cream,borderWidth:1,borderColor:C.line},pillText:{fontSize:13,color:C.ink,fontWeight:'600'},input:{minHeight:120,backgroundColor:C.cream,borderRadius:16,padding:15,fontSize:15,color:C.ink,textAlignVertical:'top',marginTop:14},optional:{fontSize:11,color:C.muted,textAlign:'center',marginTop:7},center:{flex:1,alignItems:'center',justifyContent:'center',padding:32,backgroundColor:C.cream},doneIcon:{width:74,height:74,borderRadius:28,backgroundColor:C.moss,alignItems:'center',justifyContent:'center',marginBottom:20},doneTitle:{fontSize:28,fontWeight:'700',color:C.ink},doneText:{fontSize:15,lineHeight:23,color:C.muted,textAlign:'center',marginVertical:12,marginBottom:25},intro:{fontSize:15,color:C.muted,marginTop:-10},chartHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},positive:{backgroundColor:C.sage,borderRadius:99,paddingHorizontal:10,paddingVertical:6},positiveText:{fontSize:11,fontWeight:'800',color:C.moss},chart:{height:115,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-around',marginTop:12},barWrap:{alignItems:'center',gap:8},bar:{width:20,borderRadius:7,backgroundColor:'#84A999'},barLabel:{fontSize:10,color:C.muted},insight:{fontSize:17,lineHeight:25,fontWeight:'600',color:C.ink,marginTop:8},disclaimer:{fontSize:11.5,lineHeight:17,color:C.muted,marginTop:5},newEntry:{height:54,borderRadius:18,backgroundColor:C.moss,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},journalText:{fontSize:14,lineHeight:21,color:C.muted,marginTop:4},profile:{alignItems:'center',marginVertical:6},avatar:{width:74,height:74,borderRadius:28,backgroundColor:C.sage,alignItems:'center',justifyContent:'center',marginBottom:10},avatarText:{fontSize:28,fontWeight:'800',color:C.moss},profileName:{fontSize:21,fontWeight:'700',color:C.ink,marginBottom:3},setting:{height:62,backgroundColor:C.white,borderRadius:16,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:C.line},settingText:{flex:1,fontSize:15,fontWeight:'600',color:C.ink}
});
