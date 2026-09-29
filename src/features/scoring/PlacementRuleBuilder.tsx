"use client";
import { useMemo, useState } from "react";

type Row = { rankFrom: number; rankTo: number; points: number };

export function PlacementRuleBuilder() {
  const [rows, setRows] = useState<Row[]>([{ rankFrom: 1, rankTo: 1, points: 100 }, { rankFrom: 2, rankTo: 2, points: 80 }, { rankFrom: 3, rankTo: 3, points: 60 }]);
  const serialized = useMemo(()=>JSON.stringify(rows),[rows]);
  return <fieldset className="full-span"><legend>Placement point rules</legend><input type="hidden" name="rulesJson" value={serialized}/><div className="placement-rule-list">{rows.map((row,index)=><div className="placement-rule-row" key={index}><label>Rank from<input type="number" min="1" value={row.rankFrom} onChange={(e)=>setRows(rows.map((item,i)=>i===index?{...item,rankFrom:Number(e.target.value)}:item))}/></label><label>Rank to<input type="number" min="1" value={row.rankTo} onChange={(e)=>setRows(rows.map((item,i)=>i===index?{...item,rankTo:Number(e.target.value)}:item))}/></label><label>Points<input type="number" step="any" value={row.points} onChange={(e)=>setRows(rows.map((item,i)=>i===index?{...item,points:Number(e.target.value)}:item))}/></label><button type="button" className="text-button danger-text" onClick={()=>setRows(rows.filter((_,i)=>i!==index))} disabled={rows.length===1}>Remove</button></div>)}</div><button type="button" className="secondary" onClick={()=>setRows([...rows,{rankFrom:(rows.at(-1)?.rankTo??0)+1,rankTo:(rows.at(-1)?.rankTo??0)+1,points:0}])}>+ Placement band</button></fieldset>;
}
