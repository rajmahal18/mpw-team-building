"use client";

import { useMemo, useState } from "react";
import type { ActivityDefinition, QuestionBlock } from "@/schemas/activity";
import { gradeBlockSubmission, type GradeResult } from "@/engine/grading/grade-block";

type QuestionWithSource={question:QuestionBlock;source?:string};

export function OrganizerTestMode({definition}:{definition:ActivityDefinition}){
  const questions=useMemo<QuestionWithSource[]>(()=>definition.content.flatMap((block)=>block.type==="question_pool"?block.questions.map((question)=>({question,source:block.intro?.default??"Question bank"})):["single_select","multi_select","fill_blank","text_input","textarea","number_input","ordering","matching"].includes(block.type)?[{question:block as QuestionBlock}]:[]),[definition]);
  if(!questions.length)return <p className="muted">No auto-gradable/question blocks to test yet.</p>;
  return <div className="stack">{questions.map(({question,source})=><QuestionTestCard key={question.id} question={question} source={source}/>)}</div>;
}

function QuestionTestCard({question,source}:{question:QuestionBlock;source?:string}){
  const [result,setResult]=useState<GradeResult|null>(null);
  const [textValue,setTextValue]=useState("");
  const [selected,setSelected]=useState<string[]>([]);
  const [order,setOrder]=useState<string[]>(question.type==="ordering"?question.items.map((item)=>item.id):[]);
  const [pairs,setPairs]=useState<Record<string,string>>({});
  const [showHint,setShowHint]=useState(false);
  const prompt=question.prompt.default;
  const grade=()=>{
    let payload:unknown={};
    if(question.type==="single_select")payload={choiceId:selected[0]??""};
    if(question.type==="multi_select")payload={choiceIds:selected};
    if(question.type==="fill_blank"||question.type==="text_input"||question.type==="textarea")payload={value:textValue};
    if(question.type==="number_input")payload={value:Number(textValue)};
    if(question.type==="ordering")payload={orderedIds:order};
    if(question.type==="matching")payload={pairs:question.leftItems.map((item)=>({leftId:item.id,rightId:pairs[item.id]??""}))};
    try{setResult(gradeBlockSubmission(question,payload));}catch(error){setResult({gradable:false,reason:"MISSING_ANSWER_KEY"});}
  };
  return <div className="subcard stack"><div><small className="muted">{source?`${source} · `:""}{question.type}</small><h4>{prompt}</h4>{question.timeLimitMs&&<span className="tag">{question.timeLimitMs/1000}s</span>}{question.maxAttempts&&<span className="tag">{question.maxAttempts} attempt{question.maxAttempts===1?"":"s"}</span>}</div>{question.hint&&<div><button type="button" className="text-button" onClick={()=>setShowHint(!showHint)}>{showHint?"Hide hint":"Show hint"}</button>{showHint&&<div className="notice"><span>{question.hint.default}</span></div>}</div>}
    {question.type==="single_select"&&<div className="preview-choices">{question.choices.map((choice)=><label className="check" key={choice.id}><input type="radio" name={`test-${question.id}`} checked={selected[0]===choice.id} onChange={()=>setSelected([choice.id])}/>{choice.label?.default??"Media choice"}</label>)}</div>}
    {question.type==="multi_select"&&<div className="preview-choices">{question.choices.map((choice)=><label className="check" key={choice.id}><input type="checkbox" checked={selected.includes(choice.id)} onChange={(e)=>setSelected(e.target.checked?[...selected,choice.id]:selected.filter((id)=>id!==choice.id))}/>{choice.label?.default??"Media choice"}</label>)}</div>}
    {(question.type==="fill_blank"||question.type==="text_input")&&<input value={textValue} onChange={(e)=>setTextValue(e.target.value)} placeholder="Test answer"/>}
    {question.type==="textarea"&&<textarea className="builder-prompt" value={textValue} onChange={(e)=>setTextValue(e.target.value)} placeholder="Test response"/>}
    {question.type==="number_input"&&<input type="number" step="any" value={textValue} onChange={(e)=>setTextValue(e.target.value)} placeholder="0"/>}
    {question.type==="ordering"&&<div className="stack">{order.map((id,index)=>{const item=question.items.find((x)=>x.id===id);return <div className="choice-row" key={id}><span className="order-number">{index+1}</span><span>{item?.label?.default??"Media item"}</span><div><button type="button" className="icon-button" disabled={index===0} onClick={()=>setOrder((current)=>move(current,index,-1))}>↑</button> <button type="button" className="icon-button" disabled={index===order.length-1} onClick={()=>setOrder((current)=>move(current,index,1))}>↓</button></div></div>})}</div>}
    {question.type==="matching"&&<div className="stack">{question.leftItems.map((left)=><div className="match-row" key={left.id}><span>{left.label.default}</span><span>→</span><select value={pairs[left.id]??""} onChange={(e)=>setPairs({...pairs,[left.id]:e.target.value})}><option value="">Choose</option>{question.rightItems.map((right)=><option key={right.id} value={right.id}>{right.label.default}</option>)}</select></div>)}</div>}
    <div className="row"><button type="button" onClick={grade}>Grade test answer</button>{result&&<GradeBadge result={result}/>}</div>
  </div>;
}

function move(values:string[],index:number,direction:-1|1){const next=[...values];const target=index+direction;if(target<0||target>=next.length)return next;[next[index],next[target]]=[next[target],next[index]];return next;}
function GradeBadge({result}:{result:GradeResult}){if(!result.gradable)return <span className="badge">Manual / not auto-gradable: {result.reason}</span>;return <span className={`badge ${result.correct?"success-badge":"error-badge"}`}>{result.correct?"Correct":"Not correct"} · {Math.round(result.fraction*100)}%{result.earnedPoints!==undefined?` · ${result.earnedPoints} pts`:""}</span>;}
