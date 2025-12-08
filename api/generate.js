// Bestand: api/generate.js
const { GoogleGenAI } = require("@google/genai"); 

// De GEMINI_API_KEY wordt veilig geladen vanuit Vercel's Environment Variables
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    // CORS headers voor communicatie tussen frontend en API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send({ error: 'Alleen POST-verzoeken zijn toegestaan.' });
        return;
    }

    try {
        const { player, category } = req.body;
        
        if (!player || !category) {
            res.status(400).send({ error: 'Speler en categorie zijn vereist.' });
            return;
        }

        const prompt = `
            Je bent een spelmeester voor een drinking game genaamd PULSE. 
            De speler is: **${player}**.
            De categorie is: **${category}**.
            
            Genereer een unieke, verrassende vraag of opdracht die bij deze categorie past. Koppel aan deze vraag een consequentie voor het geval de speler weigert. De consequentie moet altijd in termen van 'slokken' of 'shots' zijn.

            Stuur je antwoord terug als een enkel JSON-object (gebruik GEEN Markdown-blokken zoals \`\`\`json).
            De structuur moet zijn:
            {
              "type": "Vraag" of "Opdracht",
              "question": "De vraag of opdrachttekst",
              "consequence": "Het aantal slokken/shots"
            }
        `;

        const model = 'gemini-2.5-flash';
        
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt
        });

        // Parseer en stuur de AI-respons terug
        // LET OP: Gebruik de inhoud van 'text', Gemini kan soms extra quotes toevoegen.
        let jsonResponse;
        try {
             jsonResponse = JSON.parse(response.text.trim().replace(/^```json|```$/g, ''));
        } catch (e) {
             // Fallback voor het geval Gemini niet perfect JSON levert
             console.error("Kon JSON niet parsen:", response.text);
             throw new Error("Ongeldig JSON-formaat van AI.");
        }
        
        res.status(200).json(jsonResponse);

    } catch (error) {
        console.error("Gemini API Fout:", error);
        res.status(500).send({ 
            error: 'Fout bij het genereren van de vraag.', 
            details: error.message 
        });
    }
};