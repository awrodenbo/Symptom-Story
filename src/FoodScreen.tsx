import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { addFoodEntry, deleteFoodEntry, type FoodEntryRow } from "./api";
import { Button, Card, Field, Notice } from "./components";
import { useTheme } from "./theme/context";

const MEALS = ["breakfast","lunch","dinner","snack","drink","other"] as const;
const TAGS = ["High protein","High fiber","Fruit/veg","Dairy","Gluten","Caffeine","Alcohol","Spicy","High sugar"];
const GI = ["Bloating","Nausea","Reflux","Diarrhea","Constipation","Discomfort"];
const QUOTES = [
  "Food is fuel, pleasure, culture, connection, and care.",
  "You don't have to earn your food.",
  "One meal does not define your health.",
  "Your body deserves nourishment.",
  "Information, not judgment.",
  "Fed is better than perfect.",
  "There is room for joy in nourishment.",
  "Your food choices are data, not a grade.",
];
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");};
export default function FoodScreen({userId,entries,onChanged}:{userId:string;entries:FoodEntryRow[];onChanged:()=>Promise<void>}){
 const {theme}=useTheme(),C=theme.colors; const [date,setDate]=useState(today()),[meal,setMeal]=useState<FoodEntryRow["meal_type"]>("breakfast"),[description,setDescription]=useState(""),[tags,setTags]=useState<string[]>([]),[appetite,setAppetite]=useState<FoodEntryRow["appetite"]>(null),[hydration,setHydration]=useState<FoodEntryRow["hydration"]>(null),[gi,setGi]=useState<string[]>([]),[notes,setNotes]=useState(""),[details,setDetails]=useState(false),[calories,setCalories]=useState(""),[protein,setProtein]=useState(""),[carbs,setCarbs]=useState(""),[fat,setFat]=useState(""),[fiber,setFiber]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const quote=useMemo(()=>QUOTES[new Date().getDate()%QUOTES.length],[]);
 const chip=(on:boolean)=>({paddingVertical:8,paddingHorizontal:11,borderRadius:18,borderWidth:1,borderColor:C.brandPrimary,backgroundColor:on?C.accentSage:C.surface});
 const toggle=(v:string,list:string[],set:(x:string[])=>void)=>set(list.includes(v)?list.filter(x=>x!==v):list.concat(v));
 const num=(v:string)=>v.trim()===""?null:Number(v);
 async function save(){setBusy(true);setError("");try{await addFoodEntry(userId,{entry_date:date,meal_type:meal,description:description.trim(),tags,appetite,hydration,gi_response:gi,notes:notes.trim()||null,nutrition_details_enabled:details,calories:num(calories),protein_g:num(protein),carbs_g:num(carbs),fat_g:num(fat),fiber_g:num(fiber),source:"manual"});setDescription("");setTags([]);setGi([]);setNotes("");setCalories("");setProtein("");setCarbs("");setFat("");setFiber("");await onChanged();}catch(e){setError(e instanceof Error?e.message:"Unable to save food entry.");}finally{setBusy(false);}}
 return <ScrollView contentContainerStyle={{padding:20,gap:16,paddingBottom:120}} keyboardShouldPersistTaps="handled">
  <Text style={{fontSize:12,fontWeight:"800",letterSpacing:1.2,color:C.brandPrimary}}>FOOD</Text><Text style={{fontSize:30,fontWeight:"800",color:C.textPrimary}}>Food & nourishment</Text>
  <Card><Text style={{fontSize:18,fontWeight:"800",color:C.textPrimary}}>“{quote}”</Text><Text style={{marginTop:6,color:C.textMuted}}>A place to notice patterns, not grade your choices.</Text></Card>
  <Card><Text style={{fontSize:19,fontWeight:"800",color:C.textPrimary}}>Log food</Text><Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD"/>
   <Text style={{fontWeight:"700",color:C.textPrimary}}>Meal or moment</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{MEALS.map(x=><Pressable key={x} onPress={()=>setMeal(x)} style={chip(meal===x)}><Text style={{color:C.textPrimary,textTransform:"capitalize"}}>{x}</Text></Pressable>)}</View>
   <Field label="What did you eat or drink?" value={description} onChangeText={setDescription} multiline placeholder="As much or as little detail as you want."/>
   <Text style={{fontWeight:"700",color:C.textPrimary}}>Optional context</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:7}}>{TAGS.map(x=><Pressable key={x} onPress={()=>toggle(x,tags,setTags)} style={chip(tags.includes(x))}><Text style={{color:C.textPrimary}}>{x}</Text></Pressable>)}</View>
   <Text style={{fontWeight:"700",color:C.textPrimary}}>Appetite</Text><View style={{flexDirection:"row",gap:7}}>{(["low","typical","high"] as const).map(x=><Pressable key={x} onPress={()=>setAppetite(x)} style={chip(appetite===x)}><Text style={{color:C.textPrimary,textTransform:"capitalize"}}>{x}</Text></Pressable>)}</View>
   <Text style={{fontWeight:"700",color:C.textPrimary}}>Water today</Text><View style={{flexDirection:"row",gap:7}}>{(["low","typical","high"] as const).map(x=><Pressable key={x} onPress={()=>setHydration(x)} style={chip(hydration===x)}><Text style={{color:C.textPrimary,textTransform:"capitalize"}}>{x}</Text></Pressable>)}</View>
   <Text style={{fontWeight:"700",color:C.textPrimary}}>GI response (optional)</Text><View style={{flexDirection:"row",flexWrap:"wrap",gap:7}}>{GI.map(x=><Pressable key={x} onPress={()=>toggle(x,gi,setGi)} style={chip(gi.includes(x))}><Text style={{color:C.textPrimary}}>{x}</Text></Pressable>)}</View>
   <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline/>
   <Pressable accessibilityRole="switch" accessibilityState={{checked:details}} onPress={()=>setDetails(v=>!v)} style={{...chip(details),alignSelf:"flex-start"}}><Text style={{fontWeight:"700",color:C.textPrimary}}>{details?"✓ ":""}Include calories & macros</Text></Pressable>
   {details&&<><Text style={{color:C.textMuted}}>Optional information only. Symptom Story does not set calorie or macro goals.</Text><Field label="Calories (optional)" value={calories} onChangeText={setCalories} keyboardType="numeric"/><Field label="Protein g (optional)" value={protein} onChangeText={setProtein} keyboardType="numeric"/><Field label="Carbs g (optional)" value={carbs} onChangeText={setCarbs} keyboardType="numeric"/><Field label="Fat g (optional)" value={fat} onChangeText={setFat} keyboardType="numeric"/><Field label="Fiber g (optional)" value={fiber} onChangeText={setFiber} keyboardType="numeric"/></>}
   {error&&<Notice error text={error}/>}<Button disabled={busy||!description.trim()} label={busy?"Saving...":"Save food entry"} onPress={save}/></Card>
  <Card><Text style={{fontSize:19,fontWeight:"800",color:C.textPrimary}}>Recent entries</Text>{!entries.length?<Text style={{color:C.textMuted}}>Nothing logged yet.</Text>:entries.slice(0,20).map(e=><View key={e.id} style={{gap:5,paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.surfaceBorder}}><Text style={{fontWeight:"800",color:C.textPrimary}}>{e.entry_date} · {e.meal_type[0].toUpperCase()+e.meal_type.slice(1)}</Text><Text style={{color:C.textPrimary}}>{e.description}</Text>{e.tags.length>0&&<Text style={{color:C.textMuted}}>{e.tags.join(" · ")}</Text>}<Button secondary label="Delete" onPress={async()=>{await deleteFoodEntry(e.id);await onChanged();}}/></View>)}</Card>
  <Text style={{color:C.textMuted}}>Food entries are self-reported records for reflection and pattern-finding. They are not a diagnosis or nutrition prescription.</Text>
 </ScrollView>;
}