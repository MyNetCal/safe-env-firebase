#!/bin/sh
# Read and repair Firestore documents for the vue-safe-env project.
#
# The app's data model spreads one fact across several fields (Status,
# StatusRquiringAttentionReasons, MissingTrainingIds), so checking real data
# beats reasoning about the code when a coordinator reports something odd.
# This wraps the Firestore REST API so those checks don't need a console.
#
# The API key is the public web key already in src/firebase.js. It grants
# nothing on its own - the access comes from firestore.rules, which are
# currently wide open.
#
# Usage:
#   scripts/firestore.sh get   UsersCorporations/NFSqRy6M6cGhhIqXjZZY
#   scripts/firestore.sh list  UsersCorporations/NFSqRy6M6cGhhIqXjZZY/UserCorpTraining
#   scripts/firestore.sh query '{"structuredQuery":{"from":[{"collectionId":"Users"}],"limit":5}}'
#   scripts/firestore.sh patch UsersCorporations/abc123 '{"Status":{"stringValue":"Approved"}}' Status
#
# get/list/query print decoded JSON. patch takes the raw Firestore value
# format and a comma-separated update mask, and only touches those fields.

set -e

KEY="AIzaSyCDS2qp_u5-gtybrMW1uYl72fwJPBX23mY"
BASE="https://firestore.googleapis.com/v1/projects/vue-safe-env/databases/(default)/documents"

DECODE='
const chunks=[];
process.stdin.on("data",(d)=>chunks.push(d)).on("end",()=>{
  const raw=chunks.join("");
  let j;
  try { j=JSON.parse(raw); } catch (e) { console.log(raw); return; }
  const val=(x)=>{
    if(x==null) return null;
    const k=Object.keys(x)[0], v=x[k];
    if(k==="arrayValue") return (v.values||[]).map(val);
    if(k==="mapValue") return Object.fromEntries(Object.entries(v.fields||{}).map(([a,b])=>[a,val(b)]));
    if(k==="integerValue") return Number(v);
    if(k==="nullValue") return null;
    return v;
  };
  const doc=(d)=>({
    id: d.name.split("/").pop(),
    ...Object.fromEntries(Object.entries(d.fields||{}).map(([a,b])=>[a,val(b)])),
  });
  if(j.error){ console.error("Firestore error:", j.error.message); process.exit(1); }
  if(Array.isArray(j)) console.log(JSON.stringify(j.filter(r=>r.document).map(r=>doc(r.document)),null,2));
  else if(j.documents) console.log(JSON.stringify(j.documents.map(doc),null,2));
  else if(j.name) console.log(JSON.stringify(doc(j),null,2));
  else console.log(JSON.stringify(j,null,2));
});'

usage() {
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

[ $# -lt 1 ] && usage

case "$1" in
  get)
    [ -z "$2" ] && usage
    curl -s "$BASE/$2?key=$KEY" | node -e "$DECODE"
    ;;
  list)
    [ -z "$2" ] && usage
    curl -s "$BASE/$2?key=$KEY&pageSize=${3:-300}" | node -e "$DECODE"
    ;;
  query)
    [ -z "$2" ] && usage
    curl -s -X POST "$BASE:runQuery?key=$KEY" \
      -H "Content-Type: application/json" -d "$2" | node -e "$DECODE"
    ;;
  patch)
    [ -z "$4" ] && usage
    MASK=$(printf '%s' "$4" | tr ',' '\n' | sed 's/^/\&updateMask.fieldPaths=/' | tr -d '\n')
    curl -s -X PATCH "$BASE/$2?key=$KEY$MASK" \
      -H "Content-Type: application/json" -d "{\"fields\":$3}" | node -e "$DECODE"
    ;;
  *)
    usage
    ;;
esac
