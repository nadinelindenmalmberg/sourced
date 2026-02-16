// Swedish recipe knowledge base for RAG-style prompting
// This provides context to the AI for generating authentic Swedish recipes

export const SWEDISH_RECIPE_CONTEXT = `
## SVENSKA KLASSISKA RÄTTER - REFERENS

### Husmansrätter
- **Köttbullar**: Färs + ströbröd + mjölk + ägg + lök. Serveras med kokt potatis, gräddsås, lingonsylt, pressgurka
- **Pytt i panna**: Stekt tärnad potatis + korv/kött + lök + ägg. Serveras med rödbetor och äggula
- **Korvstroganoff**: Falukorv i strimlor + grädde + tomatpuré + lök. Serveras med ris
- **Pannbiff med lök**: Köttfärsbiffar + stekt lök + gräddsås + kokt potatis
- **Ärtsoppa**: Gula ärtor + fläsk + lök + timjan. Serveras med senap och pannkakor
- **Raggmunk**: Riven potatis + mjöl + ägg. Steks och serveras med stekt fläsk och lingon

### Fiskrätter
- **Stekt strömming**: Strömmingsfiléer i rågmjöl, steks i smör. Serveras med potatismos
- **Gravad lax**: Lax + salt + socker + dill. Serveras med hovmästarsås
- **Laxpudding**: Lax + potatis + grädde + ägg + dill. Gratineras
- **Fiskgratäng**: Fiskfilé + räkor + grädde + ost. Serveras med kokt potatis
- **Stekt sill**: Sill i mjöl, steks. Serveras med löksås och potatis

### Grytor
- **Kalops**: Nötkött + lök + morötter + kryddpeppar + lagerblad. Långkok
- **Sjömansbiff**: Nötkött + potatis + lök + öl. Ugnsrätt
- **Flygande Jacob**: Kyckling + bacon + banan + grädde + chilisås. Gratäng med ris

### Söndagsmiddag
- **Wallenbergare**: Kalvfärs + grädde + äggula. Paneras och steks. Med ärtor och potatismos
- **Fläskkarré**: Helstekt med äppelmos och potatisgratäng
- **Oxfilé**: Med rödvinsås, hasselbackspotatis och grönsaker

### Vardagsmat (modern)
- **Tacos**: Köttfärs + tacokrydda + tortillas + alla tillbehör
- **Pasta bolognese**: Köttfärssås + pasta + parmesan
- **Kycklinggryta**: Kyckling + grädde + curry/paprika + ris
- **Wok**: Kyckling/räkor + grönsaker + soja + nudlar

## SVENSKA MATLAGNINGSPRINCIPER

1. **Enkelhet**: Svenska recept är ofta okomplicerade med få ingredienser
2. **Säsong**: Använd det som är billigt och i säsong
3. **Kokt potatis**: Standardtillbehör till det mesta
4. **Grädde & smör**: Grundläggande för såser
5. **Lingonsylt**: Går till kött, köttbullar, pannkakor
6. **Dill**: Sveriges nationalört - till fisk, potatis, sås

## VANLIGA SVENSKA MÅTTENHETER
- 1 msk = 15 ml
- 1 tsk = 5 ml  
- 1 dl = 100 ml
- 1 krm = en nypa
- "lagom" = tillräckligt mycket

## TIPS FÖR BRA RECEPT
- Ge EXAKTA mängder (inte "lite" eller "efter smak" för huvudingredienser)
- Ange tider (stek 5 min, koka 20 min)
- Ange temperaturer (175°C ugn, medelvärme på spisen)
- Förklara tekniker kort om de är ovanliga
`;

export const PANTRY_STAPLES_CONTEXT = `
## BASVAROR SOM FINNS HEMMA (behöver inte köpas)

### Alltid hemma
- Salt, svartpeppar, vitpeppar
- Smör, olivolja/rapsolja
- Mjöl (vetemjöl)
- Socker
- Ägg (antas finnas)
- Mjölk (antas finnas)
- Lök, vitlök

### Vanliga kryddor
- Paprikapulver, curry, timjan, oregano, basilika
- Lagerblad, kanel, kardemumma

### Vanliga konserver/såser
- Krossade tomater, tomatpuré
- Soja, ketchup, senap
- Kycklingbuljong, grönsaksbuljong
- Vinäger
`;

export const DIFFICULTY_GUIDELINES = {
  easy: `
SVÅRIGHETSGRAD: ENKEL
- Max 5-6 steg
- Max 20-30 min tillagningstid
- Grundläggande tekniker (steka, koka, blanda)
- Ingredienser som är lätta att hitta
- Exempel: Korvstroganoff, pasta med köttfärssås, stekt lax med potatis
`,
  medium: `
SVÅRIGHETSGRAD: MEDEL
- 6-10 steg
- 30-60 min tillagningstid
- Några tekniker som kräver lite övning
- Kan inkludera ugnsrätt eller långkok
- Exempel: Lasagne, kycklinggryta, fiskgratäng
`,
  hard: `
SVÅRIGHETSGRAD: UTMANING
- 8-15 steg
- 60+ min tillagningstid
- Avancerade tekniker (reducera sås, temperera, flambera)
- Presentation är viktig
- Exempel: Oxfilé med rödvinsås, wallenbergare, pulled pork
`
};

// Generate context for AI based on available deals
export function generateRecipeContext(
  ingredients: string[], 
  difficulty: 'easy' | 'medium' | 'hard' | 'varied' = 'varied'
): string {
  const difficultyContext = difficulty === 'varied' 
    ? 'Blanda svårighetsgrader - ett enkelt, ett medel, ett lite mer avancerat'
    : DIFFICULTY_GUIDELINES[difficulty];

  return `
${SWEDISH_RECIPE_CONTEXT}

${PANTRY_STAPLES_CONTEXT}

## AKTUELLA KAMPANJVAROR ATT ANVÄNDA
${ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

## INSTRUKTIONER FÖR DENNA GENERERING
${difficultyContext}

Skapa 3 recept som:
1. Använder minst 2-3 av kampanjvarorna som HUVUDINGREDIENSER
2. Är REALISTISKA svenska vardagsrätter
3. Har EXAKTA mängder och tider
4. Är tydligt skrivna så vem som helst kan följa dem
`;
}
