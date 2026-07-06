import { generate, regenerate } from './src/utils/nameForge.js'
import { DEFAULT_LEXICON } from './src/data/lajenLexicon.js'
const venetian = {id:'venetian',on:['b','d','f','g','l','m','n','p','r','s','t','v','z','ch'],v:['a','e','i','o','ia','io','ie'],cod:['n','r',''],end:['o','a','in','ero','ia','eo'],sh:['CV']}

// A) The Ix'Citlatl case: star, Nahuatl-dominant + Latin, Ix' prefix
const A = { lexicon: DEFAULT_LEXICON, concepts:['star'], languageWeights:{nahuatl:.6, latin:.4},
  softness:.55, affixes:[{value:"Ix'",position:'prefix'}], blendMode:'portmanteau', count:6 }
const a1 = generate(A), a2 = generate(A)
console.log('A) star nahuatl60/latin40 +Ix\':')
a1.candidates.forEach(c => console.log(`   ${c.word}  [${c.respelling}]  ${c.ipa}  ← ${c.derivation.map(d=>d.language+':'+d.word).join(' + ')}`))
console.log('   deterministic:', JSON.stringify(a1)===JSON.stringify(a2))

// B) regenerate a single saved word from its recipe
const saved = a1.candidates[2]
const re = regenerate(DEFAULT_LEXICON, saved.recipe)
console.log('B) regenerate #3 from recipe:', re?.word, '=== original:', re?.word === saved.word)

// C) soft vs hard, guardian sanskrit/arabic
for (const s of [0.1, 0.9]) {
  const r = generate({ lexicon: DEFAULT_LEXICON, concepts:['guardian'], languageWeights:{sanskrit:.5,arabic:.5}, softness:s, blendMode:'portmanteau', count:4 })
  console.log(`C) guardian soft=${s}:`, r.candidates.map(c=>c.word).join(', '))
}
// D) two concepts + palette conform (jaguar+star, maya/nahuatl, venetian palette)
const D = generate({ lexicon: DEFAULT_LEXICON, concepts:['jaguar','star'], languageWeights:{maya_yucatec:.5,nahuatl:.5}, softness:.7, palette:venetian, blendMode:'alternating', count:4 })
console.log('D) jaguar+star maya/nahuatl → venetian palette:', D.candidates.map(c=>c.word).join(', '))
// E) count clamp + single language root mode + suffix
const E = generate({ lexicon: DEFAULT_LEXICON, concepts:['rose'], languageWeights:{welsh:1}, softness:.5, affixes:[{value:'-iel',position:'suffix'}], blendMode:'root', count:99 })
console.log('E) rose welsh root+-iel (count 99→clamp):', E.candidates.length, '·', E.candidates.slice(0,3).map(c=>c.word).join(', '))
