export const localEvidenceKeys=['serviceOffered','addressServiceable','threeLocalElements','localProofOrDistinction','uniqueUsefulCopy','usefulAnswer','parentLinks','metadataAgreement','datedOfficialSources','routingTest','jesseApproval','indexValue'];
export function isApproved(route,approval,integrations) {
 if(!approval || approval.selected!==true || !approval.approvedBy || approval.approvedBy!=='Jessica Hoeye' || !approval.approvedAt || !approval.contentHash || !approval.evidence || approval.hold!==false) return false;
 if(route.family==='Service-town candidate' && !localEvidenceKeys.every(k=>approval.evidence[k]===true)) return false;
 if(route.family!=='Service-town candidate' && approval.evidence.sourceGate!==true) return false;
 return integrations?.ready===true && integrations?.approvedBy==='Jessica Hoeye';
}
