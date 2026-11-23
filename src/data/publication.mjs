import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Publication permission is distinct from professional or operating assurance.
// This module reads local records only. It never loads the provider scheduler.
const nonempty = value => typeof value === 'string' && value.trim() !== '';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const widget = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const scriptUrl = 'https://static.servicetitan.com/webscheduler/shim.js';
const assuranceStates = new Set(['unverified', 'pending', 'not-tested']);

// November 3, 2026 image release: exact reviewer bytes moved to local URLs.
// Handoffs/2026-11-03_Image-Audit-and-Release.md and its release-overlay.json
// record the six byte-preserved assets. This is not approval of new reviews.
// The 54 digest pairs were independently derived by reversing only the six
// documented reviewerImage substitutions and matching the original records.
const reviewerSources=Object.freeze({
 "/assets/reviewer-preserved-215aa3fc25e10d6f.png": "215aa3fc25e10d6f18c42946682b8e67ea6a2f27ea831a33622447cb4599799e",
 "/assets/reviewer-preserved-eaac7d5335feac6b.png": "eaac7d5335feac6b51ff754efe80b04e741e5da74c294ee6322ef99b15bb98f5",
 "/assets/reviewer-preserved-99e3b839a7754035.png": "99e3b839a77540350bf00b54e4c57b1c3149a8d6fbdb5d2a0d41a7add4dceb82",
 "/assets/reviewer-preserved-b593388295375c23.png": "b593388295375c23409dbbc1c68d0722894e4436688abcc6b15e61272bdfd6b3",
 "/assets/reviewer-preserved-2556a7f94ab86af3.png": "2556a7f94ab86af3148b51fa527188124feaa750673187cb0be710e2dffc7da7",
 "/assets/reviewer-preserved-3263898e4a518e10.png": "3263898e4a518e108eddefa9f5e5c163c5d528fb816dbda514f8e0a92b3596cd"
});
export const releasedReviewerAssets=Object.freeze(Object.keys(reviewerSources));
const reviewerPagePairs=Object.freeze({
 "ST-059": [
  "f9e2a3a5216479636cc2890fb797bd4e588546f1e65a69721545c2fc682be7c7",
  "162166973981b1f184f522cdc08345b690d06468e0c78a8a07a867b99e0fff9a"
 ],
 "ST-060": [
  "682e019806199e972c1cd644046cc03195df5e95eac54821d2dd62d74c6c791f",
  "24a8e2e973a7fbd2700529779e9f9e118d8b72a904632c00422348d06305cad3"
 ],
 "ST-061": [
  "936118a4bceee7c483471b9a889c4521f2089643cde9c788ace1da2bf7a019c7",
  "4d338307040d9ea99d2befd4c13daed40e746162dd5da923fe1147cc670a3dca"
 ],
 "SL-WEL-FUR-REP": [
  "8b51c1df17d600780d2414f9cad22491cbb4e5fb2b34f34c0e37cbee164b50b1",
  "104d72852e9ac43a6dba5007bef576650516380bdb04cfff9dec6fe0f0d6b797"
 ],
 "SL-WEL-FUR-RPL": [
  "5346b9d5a0354d6fc8353c3bae2f0e827e44e33886da2044c724b907fc204ca1",
  "446571c7d2f9812c8250af58118320bc0861f74853db6754aa1d5f5adef65d80"
 ],
 "SL-WEL-AC-REP": [
  "0f7a38a861472689cd34d96ad03a9553a708b41d1cff749de6ad035ded39ac1a",
  "fa28cd85174c9d227f265eea3331180e83f92870274b60fb63421e9d6cf24113"
 ],
 "SL-GRE-FUR-REP": [
  "5aeea3aecdf49905df30e1bef2f8c95ce1b921ad1b7ae01834e5fb269b5d2b71",
  "507463f103d3fb6cd2469e65ed5c0e00f193bc0ce3dd9cb6887f732b057a196f"
 ],
 "SL-GRE-FUR-RPL": [
  "45e3c74fb545497c54ecaaf1a3976bbac2320ea0e6a76260da0882f3a41ff6e1",
  "271989be2ad86ef9d34b8d5bab69f36b32b80c8198e0d75c84d8b8ac8d4c2582"
 ],
 "SL-GRE-AC-REP": [
  "c2be3dad071d20a226576ee65c31c4691a6c8330951060cf2ea5372ca2d63973",
  "400446d86d05c26643cc2da7567fbd5555a2bd77b0d72e16e41ad66e37e231dd"
 ],
 "SL-LOV-FUR-REP": [
  "78ac297df8262e92e6c87008d0e9368ed896b74a65bdd94ca2aaf8da48f5d120",
  "1fc4be1f37d218ee9d649900efd109643c2440340cf27b214c7fd5ee018e6692"
 ],
 "SL-LOV-FUR-RPL": [
  "7c17c2c17dcf064b51874ee0d3f400d491eaa40bcaba224f834fb13fa3c8ddbe",
  "111661302f79c3aab7b3e01759a02ff05136e63cba767bb94884cf5da3880ff0"
 ],
 "SL-LOV-AC-REP": [
  "17eca124d5cf5e0754167a36018ba6a7462198de7eab02e0168938138f9f972b",
  "31a47d13ea1af29278087ee395f78ae0b13be7076eab4594760cce044b323226"
 ],
 "SL-BER-FUR-REP": [
  "3c7182461bda75362d6189befaca2a436c14fcba0a943984dfe34011f393e06a",
  "d6220077693050a87200746158141214e6534415c97f476bc06deef39ad2dc1d"
 ],
 "SL-BER-FUR-RPL": [
  "474287518055ec62815ea6d49423f3cfdc39e3125663153199ce71eadd47a4fa",
  "765c622f10630995ef8588438cb5eca61d6557191122bf762fd61d377d386a0a"
 ],
 "SL-BER-AC-REP": [
  "5cec364b295ea83cd964b24b4da27e0d042ad705ebcef1b24c235550a1ac92e5",
  "65229b0bff5179143510488cc7dbd5c6e95427f645ef546c85395ce2c9a23c76"
 ],
 "SL-WIN-FUR-REP": [
  "fa9789fc6091a6708da6dacd6f03e1f464621efa1023f582a2292ba68e031d7b",
  "128aeb144686a4e2acfb708c91d7aa8de8bbe829e6d7ebb5237e23e423ef6ee4"
 ],
 "SL-WIN-FUR-RPL": [
  "e606a4640b35f433afb23c75cc0e7f412dce538b097f65e14cc871ff24308a63",
  "6cbad6b3b1047726fdd9dad96b35464c303d3a1ac306044dec3dc6db9320c571"
 ],
 "SL-WIN-AC-REP": [
  "1c40d23bd8127380ee503046347a100f89147e5eb3885ab67ff294670c42556a",
  "508cd703b25c6abda1c8d65e0e889fe6c5880bf4e64537e27019c0f84b63034c"
 ],
 "SL-LON-FUR-REP": [
  "08eaa24386ed098442cd117651ceaf4ca85ef6498f7153bb2de062401032012f",
  "f0f6e8e3db37a9ec62c59e0cdfd9c5476f2b17bc0db30fba45a2111c116613aa"
 ],
 "SL-LON-FUR-RPL": [
  "7822aaf15da62b90e0bff4e02e37a05aac55f6cc22a0edbe67a8ad43546a19b1",
  "fa72c2a1bee04d9641d53ad8a8ada48ba066bc11ed9702a6988ce1c4b24a3149"
 ],
 "SL-LON-AC-REP": [
  "c80dddb091f2d1b759e69352a8d91570d7faf22bbe2f9129de8da09c7960a044",
  "8cba02ebd2d43cb40cc0576bdc212e3bf31c63a359783537c02cc5611552ee64"
 ],
 "SL-BOU-FUR-REP": [
  "d08f01d9adbde47cda43d79a7001c7244d71ce0dabae9f7dee55ff6330ba7c8b",
  "6a317696f022c1e42f536bc1847abda5fe17e870e7deaa71b7dd3129731095fd"
 ],
 "SL-BOU-FUR-RPL": [
  "161bd45f4ab1d2f408586441db839c169a9fff337e5aa0fa0aa494a1873c44dc",
  "75b759525dc35b48022348bec2410ba4cc8bf79cfdb5c7286e9e80f10fb060de"
 ],
 "SL-BOU-AC-REP": [
  "8bb5c76c51c034f0ed6e3f299383de71d76000ccb5bcfbab9b4a1810fc7414b1",
  "2c89c53d8f587c668c727264a014fcbac1c315612beca3b5c073ab201accdd04"
 ],
 "SL-ERI-FUR-REP": [
  "7dc4f458de2b3de04d0459e1309bbfe580bfed7c5a9e87dfbc4d2ac1cee3ed96",
  "316b65220acf14fcb39312edff5f3158eec1877895e0946d755db8eb6953486f"
 ],
 "SL-ERI-FUR-RPL": [
  "cf2475ec91b8186a2642f5e3b0a535e0f2be5f4d621d2129a034d128ba293891",
  "68a95787df52f0ef17b82382dd0dc1c5a618cdacc8b41f20a36d5e24b79e00fd"
 ],
 "SL-ERI-AC-REP": [
  "3b70c0c8b6a8653ce208819260e7fc6112a4c36c4f8e96668311ab081e45db0f",
  "1adec50961cf86fa02d4c2cb12c7c373c5a6ba53168622330ab039254fa218f2"
 ],
 "SL-FRE-FUR-REP": [
  "c9e74dd95cdcec32dabc99aa41997b42a3977afbaa2a95ea8ba7de20731b7d36",
  "5191dced1ae86ec44eb95f729e16848c5b689b6e1f3f7653bffc490e84e840fb"
 ],
 "SL-FRE-FUR-RPL": [
  "b81ca790b4fbcdad3183c7d3399444f712dc51df7be665953cf4aff03dd51e97",
  "d144352bdbcbcbfa880fbc736c950f0f279cfe8068d8230971232262020e6544"
 ],
 "SL-FRE-AC-REP": [
  "8e22e2f00fe96e1ebd6f8b8c8b062f0e5f4982958bba0c4291c8424ea339eb5b",
  "804f4371fc83f42c7bc045257973882d605e46de5391af88562d56fdcd56c2b4"
 ],
 "SL-FIR-FUR-REP": [
  "4583f9280c237ddc29a0010fc35e391b21eb31b221ebcab49922bc9ed3049854",
  "8ceb48ac3d49e2572f5cfe7ec738293d81fbaab0d603696c0a7a7e3f3047112a"
 ],
 "SL-FIR-FUR-RPL": [
  "e1271abe9c57da9bdcf530e1afceeaa1f6c04a48c9da35b7d04662aba424bbf5",
  "f9c9108f4359898d25dddfb7aba72040b8ee51cc9e8564ad794893c08d5474aa"
 ],
 "SL-FIR-AC-REP": [
  "042a73c1a5e05895e34e543949b1bc6b8cd0113ed6236bfac4f4385308655050",
  "380998aed53bbe01fdcd198d098497327b0e4f2f605ff89b311aaf7f4a8eefc8"
 ],
 "SL-THO-FUR-REP": [
  "e73381eb46605c381e54716aca3456e2db793f89d63475aa7748dea997eb301f",
  "e829e2180cedd43ba581c75daf7989014dfd8e743cd59c5b283263ece85ba8c2"
 ],
 "SL-THO-FUR-RPL": [
  "0b9de0f676d7fb0c06ddab9e3c9e110e80875829e744aeca4e9f000b5308cc48",
  "642a1221a58cc872d823e55150c8acd06d1c46b3850b4e4b3f9bdf617ecb11e4"
 ],
 "SL-THO-AC-REP": [
  "93717d38c3c09103e6ed015ad6d5124dfac73af3d626ebec8eeb5ae6589371f6",
  "d04a123944bd0463ebe006121ac02932221428b63f42f53bb992e68c50f7214d"
 ],
 "SL-BRO-FUR-REP": [
  "046e2bc36df024154e4a7a83a516ddb226a29f755497eaef01b3deb72958809c",
  "e55a6444548933c85eabe223f1bd08b6fe031d05bd07fd8dc3de32e0f0857c78"
 ],
 "SL-BRO-FUR-RPL": [
  "6bc14920965c555193eab47dc3d71d4462a39a3e21b922e516a1212858af5741",
  "35c5edc720c5f63643c7e4c0f631f0b9351f1d76bc588e1084c6aaf77d41408f"
 ],
 "SL-BRO-AC-REP": [
  "2f61865b033ef525d893ecb23cce1fabe126c233d0ea060e1aad04ba196763bb",
  "f8c4dc2621ea03bc7847ce4320f1f0d31baa7a8505019f18edb29321255ade1e"
 ],
 "SL-FCO-FUR-REP": [
  "ab2cd98ec82777a90b61f18c7c712b5a3165ab662133b358bebc662d7b14fbf3",
  "c80a34192b5a6b9e876bda795ef64dca02114fae318739bd8e54fd95b2749083"
 ],
 "SL-FCO-FUR-RPL": [
  "a50b8be3806934a8faabe4cc03afa180d37964ed710eefca316ad4ded743d1f7",
  "16e6b75dc14ddf7ace526e0342a1a5392c6e93740fe30db9d3b71f5756bbe032"
 ],
 "SL-FCO-AC-REP": [
  "98dae6868b65144469f3b8f127c6ad530ade92201d6fefc5009011e163780605",
  "265a3f6fa8a0a8b6b59da944ed30697d4bab745dfc3091f560a1fb5e5f643d5e"
 ],
 "SL-JOH-FUR-REP": [
  "104cb2d22daeb1ab752c1e3ed28e754272741591cca3bb01b624f6206ffdf981",
  "d400cef669612e6abda1dea4d824cfaeda29355593408ca3a3e9068ae3959d63"
 ],
 "SL-JOH-FUR-RPL": [
  "1eaf17bdc416ea94d81bb5f637b1c62ece2cba663e571990385056bdae4fc7ac",
  "f4e60bcaa07da11ac34d4d668f224b183a79ce2ca1c4e278818c6229287cbca4"
 ],
 "SL-JOH-AC-REP": [
  "76992c42b9c1310ee2da05a93cdf4c637ac98a354508a15d84772ce2a98a30e3",
  "f2c5b4467c18c43dd511f9cfd3422a3cd93138a1992e5b1900e170f827471194"
 ],
 "SL-TIM-FUR-REP": [
  "74b8e2eccbfee93ea0bd416f39d808151967526396f9621031c5cebed353bc4d",
  "2cdb9164faa8ae17b584a0a0b309e90a69456e4072e31289d6df6000e3eb2c73"
 ],
 "SL-TIM-FUR-RPL": [
  "9bce8b090e6f3fa98e799f556a9a2d0695a861543267f9dddd3ffa4257fc64c6",
  "06c70bb683b7149eb35d485a5eb0beacf6b9eb4252e0a21e772ea589379b2b0a"
 ],
 "SL-TIM-AC-REP": [
  "415029face1a07cd516ce3a2348e10a7907e18c9b2e1eeb84d1c9e63c2686bd5",
  "123230193234c85c341a0b0266efaad8334240ad5ee342078661d3d3768fe614"
 ],
 "SL-SEV-FUR-REP": [
  "104ba0dc0829177acbbab8868735b36a8109e2affcdbedbaf406c16181dda54e",
  "8a4535cf36611cc0f0b8e8d074ec136ba26e80fde785f00b22f0a3a8e6697d8d"
 ],
 "SL-SEV-FUR-RPL": [
  "c90382bde7f5b4e8a993edff9c3e652040d28ef5031b7e1180aa6d8bf5723e8a",
  "968135afceafcc83c256a1a5d7a735babd84557e753f5ce7526c7c0b8ee84e7d"
 ],
 "SL-SEV-AC-REP": [
  "cc384cbc12150ada1c9dd649db0b790e5bdf070587008d9acc3ea379ddc6630b",
  "d7a1ad75d4ae9f61f2efdbad10d681d68c2eb6fa49a303e9a519dc7371c153ee"
 ],
 "SL-DAC-FUR-REP": [
  "3402ad16f51d6b182261fd7c03f922f7a419426e828d5c7e25bb4045ca9d9aa4",
  "59432cb40093f5f1fc54ad2c5e810a4a01650ebcba33618ab5858935f686a9c0"
 ],
 "SL-DAC-FUR-RPL": [
  "336a4197b7d92d9444375454c920eb07ace02b78aaa62cafbc144d1090432a66",
  "0b20bcdecd1c88de8c85c2826708fda6b90c9133b3df3fa9ead35c4b3b4975ad"
 ],
 "SL-DAC-AC-REP": [
  "9afd9d029c7ee1d3b8a464f04ba840127da423de03da811839ed40bc708f6380",
  "748fc5e555ae1f4abbeb0752dc4e4c46e5055e1c45ed0443ff77d9e24605c0fe"
 ]
});
const contentHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function reviewerReleaseMatches(id,sourceHash,originalHash,expected,now){
 const pair=Object.hasOwn(reviewerPagePairs,id)?reviewerPagePairs[id]:undefined;
 if(!pair||!recordedDate('2026-11-03',now)||!object(expected.pageContents?.[id])||!object(expected.reviewerAssetHashes)||pair[0]!==originalHash||pair[1]!==sourceHash)return false;
 const content=expected.pageContents[id];
 if(contentHash(content)!==sourceHash)return false;
 let found=0,valid=true;
 const inspect=value=>{
  if(Array.isArray(value)){value.forEach(inspect);return;}
  if(!object(value))return;
  for(const [key,item] of Object.entries(value)){
   if(key==='reviewerImage'&&typeof item==='string'&&Object.hasOwn(reviewerSources,item)){
    found++;if(expected.reviewerAssetHashes[item]!==reviewerSources[item])valid=false;
   } else inspect(item);
  }
 };
 inspect(content);return found>0&&valid;
}

// Exact later source identities from independently authorized production releases.
// These do not authorize other edits or prove rebuilt HTML matches production.
// Privacy: 2026-10-19_MGI-DNI-Immediate-Start.md, Pages 44c2e02c.
// Images: 2026-11-03_Image-Audit-and-Release.md and the repair provenance.json,
// Pages 6ac7b6d2. Existing October 12 and supplemental records remain intact.
const releasedPrivacy = Object.freeze({
 'ST-014': ['97af7d0265a1f7dcff01ed42117fe5dc969ffa1af1449edcc266d9c83f3ed9d1','b63d42fd2c0d5dca0c26b4da85e6ad8c8f4d353e95dceab00266030d8963c571','2eb080c0b413863f8dc98099cd4f24e94dcc4ab9df3de3b2993667123b5907a3'],
 'ST-017': ['5e0d179986401db913ca38d31a98a85d4c8832f3eeb28c04c633d346a165ad7a','87d92ce26044423818ab88b828022a6c9ac8a77928c0a2ab5740d778207c067d','a487cf83a3ced41cdbabc11b6e000627ce30fe3bc8f0fba265886440fa2d5023']
});
const releasedImages = Object.freeze({
 'IMG-006': ['c0b4d23073ae003aeac2c4023f50ada5c51a36b03a9662ed4db4ee6c3016c4e7','cc3433e096dc7e5deaccd98a3829b7053bd5840473504c83edb6c4ff08976ba9'],
 'IMG-025': ['6593b8794ad7f71275bc821fae25b5d3d60b26f3c678a83c314318fc526a32c9','0b046ae8409e3b65b48728532098447054877e71711ae8aab611c5a571471266'],
 'IMG-033': ['ce1690ab03503423b89be09d4f00788183c4e1c2d0a263e8ba4e46b56fc3d694','286ca6121e61addaf34a461495b4a3a20b0815138333cc058ebe500d504c745d'],
 'TOWN-loveland-05': ['f0b488017f798c72b5fcee1209c7014155f86478a19d2a09217baee7f6ffef6a','59d5129ea0263953a11e3fc4af106b1bedf10c452877029930e45bead933822c'],
 'TOWN-thornton-05': ['14f70ada188512803b704ec94fa6b481e9581e25cdc5368bb86aff65c3c875cc','9a64466392deaa08ec4430f4065955321b8006f5bd78452bd9e546c1efac4fbb'],
 'TOWN-broomfield-05': ['75b8936508b365ed649d2fe82e141d9ccf281515e97c5e7ba57211061c2dc2c8','5a260ce5afc82089f1ee58d10d11acc8ca20732d9cdf4cca86aca082410dae02']
});

// Separate historical provenance for the Financing page. Jesse accepted Phase 1
// on November 4; the acceptance package identified the live Financing hub and
// both lender application buttons. It did not attest an exact content hash or
// every word. The released source hash below identifies the separately deployed
// version; it is not a claim of hash-specific client approval. The holiday
// approval remains limited to its own scope.
export const financingReleaseProvenance=Object.freeze({
 pageId:'ST-007',
 canonicalOrigin:'https://mgiheatingandair.com',
 acceptedAt:'2026-11-04',
 acceptanceEvidence:'gmail:1a1a798ee16385b8',
 releaseEvidence:'Handoffs/2026-10-20_MGI-Synchrony-Apply-Link-Preview.md',
 sourceCommit:'d79b1adc7dad7f5ae9b89b5fd81b4290ee66176f',
 priorHash:'a3df5264f17d0d47a6659ae513a2804c24ebaa4dbc7e0667fbb4a75086991453',
 releasedHash:'33d310a4edd7e60c1a24c4fba9b1cfc81c53d639196617d4af42384f20fafd06'
});

export function financingReleaseMatches(provenance,record,expected,id,sourceHash,now){
 const p=financingReleaseProvenance;
 if(!object(provenance)||Object.keys(provenance).length!==Object.keys(p).length||Object.keys(p).some(k=>provenance[k]!==p[k]))return false;
 return id===p.pageId && record?.approvedBy==='Jessica Hoeye' && record?.reportedBy==='Reu' && record.canonicalOrigin===p.canonicalOrigin && expected.canonicalOrigin===p.canonicalOrigin && recordedDate(p.acceptedAt,now) && record.pages?.[id]?.contentHash===p.priorHash && record.measurementRelease?.pages?.[id]?.contentHash===p.priorHash && sourceHash===p.releasedHash;
}

// Jesse requested the Service Finance application link in her November 23
// email. Reu separately specified the two supporting sentences and later
// directed release as fCMO. This record attributes each instruction accurately;
// it does not assert that Jesse approved the exact sentences or that the
// agreement's Authorized Approver provision changed. The two fixed hashes bind
// only the specifically requested Financing page content and component.
export const financingNov23Direction=Object.freeze({
 pageId:'ST-007',
 canonicalOrigin:'https://mgiheatingandair.com',
 clientLinkRequest:'gmail:1a2098a9db4b31af',
 directedBy:'Reu Smith, MGI fCMO',
 directedAt:'2026-11-23',
 directionEvidence:"I'm not sure wehre that rule came from I am the fcmo I say go.",
 clientApprovalScope:'Jesse requested the Service Finance link; approval of the exact replacement copy is not established',
 contractStatus:'This direction does not amend the agreement',
 scope:'Service Finance application link and the specified Financing introduction and provider FAQ answer',
 pageHash:'33584f5c5779fa91ba47c801988b42b8933d3d9c831b75c34b752ceac4d05e7b',
 componentHash:'a1d195c44f8c47f3228c7083926ca33757d7d3b74cfdf743d9811d58d130c37f'
});

export function financingNov23DirectionMatches(direction,record,expected,id,sourceHash,now){
 const d=financingNov23Direction,p=financingReleaseProvenance;
 if(!object(direction)||Object.keys(direction).length!==Object.keys(d).length||Object.keys(d).some(k=>direction[k]!==d[k]))return false;
 return financingReleaseMatches(p,record,expected,id,p.releasedHash,now)
  && recordedDate(d.directedAt,now)
  && sourceHash===d.pageHash
  && expected?.financingComponentHash===d.componentHash;
}

function recordedDate(value, now) {
 if (!nonempty(value) || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
 const parsed = Date.parse(value);
 return Number.isFinite(parsed) && new Date(value.slice(0, 10)).toISOString().slice(0, 10) === value.slice(0, 10) && parsed <= Date.parse(now);
}

export function readPublication(filePath = new URL('./publication.json', import.meta.url)) {
 return JSON.parse(readFileSync(filePath, 'utf8'));
}

/** Expected hashes must be computed from the actual selected render inputs. */
export function publicationErrors(record, expected = {}) {
 const errors = [];
 if (!object(record)) return ['publication: supply a recorded public-release authorization'];
 if (record.approvedBy !== 'Jessica Hoeye') errors.push('publication.approvedBy: record Jessica Hoeye public-release approval');
 if (record.reportedBy !== 'Reu') errors.push('publication.reportedBy: record Reu as the approval reporter');
 if (!recordedDate(record.approvedAt, expected.now || new Date().toISOString())) errors.push('publication.approvedAt: supply a real, non-future approval date');
 if (!nonempty(record.evidenceReference)) errors.push('publication.evidenceReference: name the human instruction reporting approval');
 if (expected.canonicalOrigin !== 'https://mgiheatingandair.com' || record.canonicalOrigin !== expected.canonicalOrigin) errors.push('publication.canonicalOrigin: authorization must bind the exact production origin https://mgiheatingandair.com');
 const supplement=record.supplementalRelease;
 // This supplemental permission covers measurement presentation and the exact
 // frozen render source only. All existing content except privacy disclosures
 // must retain its earlier baseline or landing authorization.
 // A later holidaySpecialsRelease is append-only. Once it is valid and binds
 // the current whole-site fingerprint, earlier records stay shape-checked
 // history. Their stored fingerprints are not compared with the current one.
 const measurement=record.measurementRelease;
 const selectedIds=Object.keys(expected.pageHashes||{});
 const priorPages={...(record.pages||{}),...(supplement?.pages||{})};
 const measurementIds=Object.keys(measurement?.pages||{});
 const now=expected.now||new Date().toISOString();
 const holiday=record.holidaySpecialsRelease;
 const holidayRoutes=Array.isArray(holiday?.routes)?holiday.routes:[];
 const holidayScope='/specials/ plus the Specials anchors in the Base.astro header, mobile menu and footer';
 const holidayShape=object(holiday)&&holiday.authorizedBy==='Reu'&&holiday.authorizedAt==='2026-11-23T08:26:00-07:00'&&recordedDate(holiday.authorizedAt,now)&&holiday.canonicalOrigin==='https://mgiheatingandair.com'&&nonempty(holiday.evidenceReference)&&holiday.evidenceReference.includes('We are good on all yeps.')&&holiday.scope===holidayScope&&holidayRoutes.length===1&&holidayRoutes[0]==='HOLIDAY-SPECIALS';
 let holidayCurrent=false;
 if(holiday){
  if(!holidayShape)errors.push('publication.holidaySpecialsRelease: require Reu, the Nov 23 8:26 AM MT timestamp, production origin, the yeps evidence, the Specials scope, and only route HOLIDAY-SPECIALS');
  if(holiday.renderSourceHash==='PENDING_WHOLE_SITE_FINGERPRINT')errors.push('publication.holidaySpecialsRelease.renderSourceHash: placeholder must be replaced by npm run bind:holiday-fingerprint on a full tree');
  else if(!hash(holiday.renderSourceHash))errors.push('publication.holidaySpecialsRelease.renderSourceHash: newest approval needs the current whole-site fingerprint');
  else if(!hash(expected.renderSourceHash)||holiday.renderSourceHash!==expected.renderSourceHash)errors.push('publication.holidaySpecialsRelease.renderSourceHash: newest record must match the current fingerprint');
  else if(holidayShape)holidayCurrent=true;
 }
 const historicalMeasurement=holidayCurrent&&object(measurement)&&measurement.authorizedBy==='Reu'&&measurement.scope==='sitewide-consent-tag-manager'&&measurement.containerId==='GTM-5NWW55ZN'&&measurement.canonicalOrigin===expected.canonicalOrigin&&recordedDate(measurement.authorizedAt,now)&&nonempty(measurement.evidenceReference)&&hash(measurement.renderSourceHash)&&object(measurement.pages)&&object(record.pages)&&Object.keys(record.pages).every(id=>Object.hasOwn(measurement.pages,id))&&measurementIds.every(id=>Object.hasOwn(record.pages,id)||/^LP-00[1-9]$/.test(id))&&measurementIds.every(id=>hash(measurement.pages[id]?.contentHash));
 const landingShapeIds=['LP-001','LP-002','LP-003','LP-004','LP-005','LP-006','LP-007','LP-008','LP-009'];
 const supplementalIds=Object.keys(supplement?.pages||{});
 const historicalSupplement=holidayCurrent&&object(supplement)&&supplement.authorizedBy==='Reu'&&supplement.canonicalOrigin===expected.canonicalOrigin&&recordedDate(supplement.authorizedAt,now)&&nonempty(supplement.evidenceReference)&&hash(supplement.renderSourceHash)&&object(supplement.pages)&&[9,11].includes(supplementalIds.length)&&landingShapeIds.every(id=>supplementalIds.includes(id))&&supplementalIds.every(id=>landingShapeIds.includes(id)||['ST-014','ST-017'].includes(id))&&supplementalIds.every(id=>hash(supplement.pages[id]?.contentHash));
 const scopedMeasurement=!holidayCurrent&&object(measurement)&&measurement.authorizedBy==='Reu'&&measurement.scope==='sitewide-consent-tag-manager'&&measurement.containerId==='GTM-5NWW55ZN'&&measurement.canonicalOrigin===expected.canonicalOrigin&&recordedDate(measurement.authorizedAt,now)&&nonempty(measurement.evidenceReference)&&hash(measurement.renderSourceHash)&&measurement.renderSourceHash===expected.renderSourceHash&&object(measurement.pages)&&selectedIds.length>0&&measurementIds.length===selectedIds.length&&measurementIds.every(id=>Object.hasOwn(expected.pageHashes,id)&&Object.hasOwn(priorPages,id)&&measurement.pages[id]?.contentHash===expected.pageHashes[id])&&selectedIds.every(id=>['ST-014','ST-017'].includes(id)||priorPages[id]?.contentHash===expected.pageHashes[id]);
 if(measurement&&!scopedMeasurement&&!historicalMeasurement)errors.push('publication.measurementRelease: require exact Reu permission, production origin, source, container, existing route set, and unchanged non-privacy content');
 const landingIds=Object.keys(expected.pageHashes||{}).filter(id=>/^LP-00[1-9]$/.test(id));
 const permittedIds=[...landingIds,'ST-014','ST-017'];
 const scopedSupplement=!holidayCurrent&&object(supplement)&&supplement.authorizedBy==='Reu'&&supplement.canonicalOrigin===expected.canonicalOrigin&&recordedDate(supplement.authorizedAt,now)&&nonempty(supplement.evidenceReference)&&hash(supplement.renderSourceHash)&&(supplement.renderSourceHash===expected.renderSourceHash||scopedMeasurement)&&object(supplement.pages)&&landingIds.length===9&&[9,11].includes(supplementalIds.length)&&supplementalIds.every(id=>permittedIds.includes(id))&&supplementalIds.every(id=>(supplement.pages[id]?.contentHash===expected.pageHashes[id]||(scopedMeasurement&&['ST-014','ST-017'].includes(id))))&&landingIds.every(id=>(supplement.pages[id]?.contentHash===expected.pageHashes[id]||(scopedMeasurement&&['ST-014','ST-017'].includes(id))));
 if(supplement&&!scopedSupplement&&!historicalSupplement)errors.push('publication.supplementalRelease: require exact Reu authorization for the nine campaign landing pages and explicitly authorized privacy disclosures only');
 if (!hash(expected.renderSourceHash) || (!holidayCurrent && record.renderSourceHash !== expected.renderSourceHash&&!scopedSupplement&&!scopedMeasurement)) errors.push('publication.renderSourceHash: rendered source changed or exact source binding is missing');
 if(holidayCurrent&&!hash(record.renderSourceHash))errors.push('publication.renderSourceHash: October 12 record must keep a well-formed historical fingerprint');
 for (const [field, expectedField, hashField] of [['pages', 'pageHashes', 'contentHash'], ['images', 'imageHashes', 'sourceHash']]) {
  const wanted = expected[expectedField];
  const approved = record[field];
  if (!object(wanted) || !Object.keys(wanted).length) { errors.push(`expected.${expectedField}: supply actual nonempty source hashes`); continue; }
  if (!object(approved)) { errors.push(`publication.${field}: supply exact authorized source bindings`); continue; }
  for (const [id, sourceHash] of Object.entries(wanted)) {
   const historicalLanding = field==='pages' && landingShapeIds.includes(id)
    ? ((historicalMeasurement ? measurement.pages[id]?.contentHash : undefined) ?? (historicalSupplement ? supplement.pages[id]?.contentHash : undefined))
    : undefined;
   const baseHash=(field==='pages'&&scopedMeasurement?measurement.pages[id]?.contentHash:undefined)??(field==='pages'&&scopedSupplement?supplement.pages[id]?.contentHash:undefined)??historicalLanding??approved[id]?.[hashField];
   const privacy=field==='pages'?releasedPrivacy[id]:undefined;
   const image=field==='images'?releasedImages[id]:undefined;
   const privacyMatch=!!privacy && recordedDate('2026-10-19',now) && approved[id]?.contentHash===privacy[0] && measurement?.authorizedBy==='Reu' && measurement.scope==='sitewide-consent-tag-manager' && measurement.containerId==='GTM-5NWW55ZN' && measurement.canonicalOrigin===expected.canonicalOrigin && recordedDate(measurement.authorizedAt,now) && nonempty(measurement.evidenceReference) && hash(measurement.renderSourceHash) && measurement.pages?.[id]?.contentHash===privacy[1] && sourceHash===privacy[2];
   const imageMatch=!!image && recordedDate('2026-11-03',now) && approved[id]?.sourceHash===image[0] && sourceHash===image[1];
   const reviewerMatch=field==='pages' && reviewerReleaseMatches(id,sourceHash,approved[id]?.contentHash,expected,now);
   const financingMatch=field==='pages' && (financingReleaseMatches(financingReleaseProvenance,record,expected,id,sourceHash,now)||financingNov23DirectionMatches(financingNov23Direction,record,expected,id,sourceHash,now));
   if (!hash(sourceHash) || (baseHash!==sourceHash && !privacyMatch && !imageMatch && !reviewerMatch && !financingMatch)) errors.push(`publication.${field}.${id}.${hashField}: source changed or authorization missing`);
  }
  for (const id of Object.keys(approved)) if (!Object.hasOwn(wanted, id)) errors.push(`publication.${field}.${id}: extra authorization outside the selected source set`);
 }
 const site = expected.site || {};
 const scheduler = record.scheduler;
 if (!object(scheduler) || scheduler.requestProvider !== 'servicetitan-webscheduler' || !widget(site.schedulerWidgetId) || scheduler.widgetId !== site.schedulerWidgetId || site.schedulerWebsiteUrl !== expected.canonicalOrigin || scheduler.websiteUrl !== site.schedulerWebsiteUrl || scheduler.scriptUrl !== scriptUrl) {
  errors.push('publication.scheduler: bind the exact configured ServiceTitan widget, production website URL, and official shim script');
 }
 if (!Array.isArray(record.unresolvedAssurances)) errors.push('publication.unresolvedAssurances: explicitly record outstanding assurance checks');
 else {
  const ids = new Set();
  for (const assurance of record.unresolvedAssurances) {
   if (!object(assurance) || !nonempty(assurance.id) || !assuranceStates.has(assurance.status) || !nonempty(assurance.owner) || !nonempty(assurance.nextAction)) errors.push('publication.unresolvedAssurances: each item needs id, unverified/pending/not-tested status, owner, and nextAction');
   if (ids.has(assurance?.id)) errors.push(`publication.unresolvedAssurances: duplicate id ${assurance.id}`);
   ids.add(assurance?.id);
  }
 }
 // Permission does not manufacture readiness or independent verification.
 const rejectClaims = (value, path) => {
  if (!object(value) && !Array.isArray(value)) return;
  for (const [key, item] of Object.entries(value)) {
   if (['ready', 'verified', 'sourceGate', 'professionallyReviewed', 'consentReviewed', 'routingTest', 'domainVerified'].includes(key)) errors.push(`${path}.${key}: assurance claims belong in separate evidence records`);
   if (key !== 'evidenceReference' && key !== 'nextAction') rejectClaims(item, `${path}.${key}`);
  }
 };
 rejectClaims(record, 'publication');
 return errors;
}

export function assertPublication(record, expected) {
 const errors = publicationErrors(record, expected);
 if (errors.length) throw Error('Public release blocked: exact publication authorization is incomplete\n' + errors.join('\n'));
}

/** An audit of permission is never a claim that unresolved facts were verified. */
export function publicationAudit(record, expected) {
 assertPublication(record, expected);
 return {
  publicationAuthorized: true,
  approvedBy: record.approvedBy,
  reportedBy: record.reportedBy,
  approvedAt: record.approvedAt,
  evidenceReference: record.evidenceReference,
  canonicalOrigin: record.canonicalOrigin,
  renderSourceHash: record.renderSourceHash,
  pageCount: Object.keys(expected.pageHashes).length,
  supplementalAuthorization:record.supplementalRelease||null,
  measurementAuthorization:record.measurementRelease||null,
  financingDirection:financingNov23DirectionMatches(financingNov23Direction,record,expected,'ST-007',expected.pageHashes?.['ST-007'],expected.now||new Date().toISOString())?structuredClone(financingNov23Direction):null,
  imageCount: Object.keys(record.images).length,
  assuranceStatus: 'unverified',
  unresolvedAssurances: structuredClone(record.unresolvedAssurances)
 };
}
