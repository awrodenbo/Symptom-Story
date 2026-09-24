import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { addMedication, deleteMedication, logMedication, type MedicationLogRow, type MedicationRow } from "./api";
import { Button, Card, Field } from "./components";
import { useTheme } from "./theme/context";
const D=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const T={morning:"Morning",afternoon:"Afternoon",evening:"Evening",night:"Night"} as const;
const key=(y:number,m:number,d:number)=>[y,String(m+1).padStart(2,"0"),String(d).padStart(2,"0")].join("-");
function due(m:MedicationRow,date:string){
 const day=new Date(date+"T00:00:00").getDay();
 const frequency=m.frequency??"custom";
 const weekdays=Array.isArray(m.weekdays)?m.weekdays:[];
 if(frequency==="daily") return true;
 if(frequency==="weekly"||frequency==="custom") return weekdays.includes(day);
 // Legacy medications created before structured schedules remain visible but are not assumed due.
 return false;
}
function timeLabel(m:MedicationRow){return m.time_of_day&&T[m.time_of_day]?T[m.time_of_day]:m.schedule||"No usual time";}
export default function MedicationScreen({userId,medications,logs,onChanged}:{userId:string;medications:MedicationRow[];logs:MedicationLogRow[];onChanged:()=>Promise<void>}){
 const {theme}=useTheme(),C=theme.colors,n=new Date(); const [cal,setCal]=useState({y:n.getFullYear(),m:n.getMonth()}),[selected,setSelected]=useState(key(n.getFullYear(),n.getMonth(),n.getDate()));
 const [name,setName]=useState(""),[frequency,setFrequency]=useState<MedicationRow["frequency"]>("daily"),[tod,setTod]=useState<NonNullable<MedicationRow["time_of_day"]>>("morning"),[weekdays,setWeekdays]=useState<number[]>([]);
 const logsFor=(d:string)=>logs.filter(l=>(l.scheduled_date??l.taken_at.slice(0,10))===d), selectedMeds=medications.filter(m=>due(m,selected)||logsFor(selected).some(l=>l.medication_id===m.id));
 async function add(){await addMedication(userId,{name:name.trim(),frequency,time_of_day:tod,weekdays});setName("");await onChanged();}
 async function mark(m:MedicationRow,status:"taken"|"skipped"){await logMedication(userId,m.id,selected,status);await onChanged();}
 const chip=(on:boolean)=>({paddingVertical:8,paddingHorizontal:11,borderRadius:18,borderWidth:1,borderColor:C.brandPrimary,backgroundColor:on?C.accentSage:C.surface});
 return <ScrollView contentContainerStyle={{padding:20,gap:16,paddingBottom:120}}>
  <Text style={{fontSize:12,fontWeight:"800",letterSpacing:1.2,color:C.brandPrimary}}>MEDICATIONS</Text><Text style={{fontSize:30,fontWeight:"800",color:C.textPrimary}}>Medication calendar</Text>
  <Text style={{color:C.textMuted}}>Plan when you usually take medications and record what actually happened. Symptom Story does not provide dosing advice.</Text>
  <Card><Text style={{fontSize:19,fontWeight:"800",color:C.textPrimary}}>Add medication schedule</Text><Field label="Medication name" value={name} onChangeText={setName} maxLength={120}/>
   <Text style={{fontWeight:"700",color:C.textPrimary}}>How often?</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{(["daily","weekly","as_needed","custom"] as const).map(f=><Pressable key={f} onPress={()=>setFrequency(f)} style={chip(frequency===f)}><Text style={{color:C.textPrimary}}>{f==="as_needed"?"As needed":f[0].toUpperCase()+f.slice(1)}</Text></Pressable>)}</View>
   {(frequency==="weekly"||frequency==="custom")&&<><Text style={{fontWeight:"700",color:C.textPrimary}}>Days</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:6}}>{D.map((d,i)=><Pressable key={d} onPress={()=>setWeekdays(v=>v.includes(i)?v.filter(x=>x!==i):v.concat(i))} style={chip(weekdays.includes(i))}><Text style={{color:C.textPrimary}}>{d}</Text></Pressable>)}</View></>}
   <Text style={{fontWeight:"700",color:C.textPrimary}}>Usual time of day</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{(Object.keys(T) as (keyof typeof T)[]).map(t=><Pressable key={t} onPress={()=>setTod(t)} style={chip(tod===t)}><Text style={{color:C.textPrimary}}>{T[t]}</Text></Pressable>)}</View>
   <Button disabled={!name.trim()||((frequency==="weekly"||frequency==="custom")&&!weekdays.length)} label="Add medication" onPress={add}/></Card>
  <Card><View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between"}}><Button secondary label="‹" onPress={()=>setCal(v=>v.m===0?{y:v.y-1,m:11}:{y:v.y,m:v.m-1})}/><Text style={{fontSize:18,fontWeight:"800",color:C.textPrimary}}>{new Date(cal.y,cal.m,1).toLocaleDateString(undefined,{month:"long",year:"numeric"})}</Text><Button secondary label="›" onPress={()=>setCal(v=>v.m===11?{y:v.y+1,m:0}:{y:v.y,m:v.m+1})}/></View>
   <View style={{flexDirection:"row",flexWrap:"wrap"}}>{D.map(d=><Text key={d} style={{width:"14.285%",textAlign:"center",fontSize:11,fontWeight:"700",color:C.textMuted}}>{d[0]}</Text>)}{Array.from({length:new Date(cal.y,cal.m,1).getDay()}).map((_,i)=><View key={"b"+i} style={{width:"14.285%",height:48}}/>)}{Array.from({length:new Date(cal.y,cal.m+1,0).getDate()}).map((_,i)=>{const d=i+1,k=key(cal.y,cal.m,d),scheduled=medications.some(m=>due(m,k)),taken=logsFor(k).some(l=>l.status==="taken");return <Pressable key={k} onPress={()=>setSelected(k)} style={{width:"14.285%",height:48,alignItems:"center",justifyContent:"center",borderRadius:24,borderWidth:selected===k?2:0,borderColor:C.brandPrimary,backgroundColor:taken?C.accentSage:undefined}}><Text style={{color:C.textPrimary,fontWeight:selected===k?"800":"500"}}>{d}</Text>{scheduled&&<View style={{width:6,height:6,borderRadius:3,marginTop:3,backgroundColor:taken?C.brandPrimary:C.brandSecondary}}/>}</Pressable>})}</View><Text style={{color:C.textMuted}}>Dot = scheduled · filled day = recorded taken</Text></Card>
  <Card><Text style={{fontSize:19,fontWeight:"800",color:C.textPrimary}}>{new Date(selected+"T00:00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"})}</Text>{!selectedMeds.length?<Text style={{color:C.textMuted}}>No scheduled medications for this day.</Text>:selectedMeds.map(m=>{const e=logsFor(selected).find(l=>l.medication_id===m.id);return <View key={m.id} style={{gap:8,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.surfaceBorder}}><Text style={{fontWeight:"800",color:C.textPrimary}}>{m.name}</Text><Text style={{color:C.textMuted}}>{timeLabel(m)} · {e?e.status:"Not logged"}</Text><View style={{flexDirection:"row",gap:8}}><Button secondary={e?.status!=="taken"} label="Taken" onPress={()=>mark(m,"taken")}/><Button secondary={e?.status!=="skipped"} label="Skipped" onPress={()=>mark(m,"skipped")}/></View></View>})}</Card>
  {medications.map(m=><Card key={m.id}><Text style={{fontSize:18,fontWeight:"800",color:C.textPrimary}}>{m.name}</Text><Text style={{color:C.textMuted}}>{(m.frequency??m.schedule??"Existing medication").replace("_"," ")} · {m.time_of_day?T[m.time_of_day]:"No usual time"}</Text><Button secondary label="Remove medication" onPress={async()=>{await deleteMedication(m.id);await onChanged();}}/></Card>)}
 </ScrollView>;
}