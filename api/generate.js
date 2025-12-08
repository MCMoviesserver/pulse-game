// Bestand: api/generate.js

import { GoogleGenAI } from '@google/genai';

// Belangrijk: De Vercel Serverless functie handler
export default async function handler(req, res) {
    
    // Controleer of de methode POST is, zoals de frontend verwacht
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Methode niet toegestaan.' });
    }

    // 1. Haal de API-sleutel op uit Vercel's Omgevingsvariabelen
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Fout: GEMINI_API_KEY is niet ingesteld in Vercel.");
        return res.status(500).json({ 
            error: "API Key ontbreekt. Controleer of GEMINI_API_KEY is ingesteld in Vercel's omgevingsvariabelen." 
        });
    }

    // 2. Initialiseer de Gemini AI client
    let ai;
    try {
        ai = new GoogleGenAI({ apiKey });
    } catch (e) {
        console.error("Fout bij initialiseren van GoogleGenAI:", e);
        return res.status(500).json({ error: "Fout bij initialiseren van de AI-service." });
    }
    
    // Haal de contextgegevens uit de POST body
    const { category, currentPlayer, contextPlayers } = req.body;

    // 3. Bouw de AI Prompt
    const prompt = `
        Je bent een game master voor een sociaal drankspel genaamd PULSE.
        De huidige spelers zijn: ${contextPlayers}.
        De speler die nu aan de beurt is: ${currentPlayer}.
        De gekozen categorie is: ${category}.

        Genereer een unieke vraag of opdracht voor speler ${currentPlayer} die relevant is voor de categorie.

        De output moet een puur JSON-object zijn in het volgende formaat (zonder extra tekst of markdown):
        {
          "type": "DARE OF SHOT" of "DEEP DIVE" of "BORREL",
          "question": "De daadwerkelijke vraag of opdracht voor de speler.",
          "consequence": "De te nemen consequentie als de speler weigert. (bijv. 'Twee slokken', 'Een shotje', 'Drie keer opdrukken')"
        }
        
        Zorg ervoor dat de 'type' overeenkomt met de categorie (gebruik 'DEEP DIVE' voor Deep Talk en 'DARE OF SHOT' of 'BORREL' voor Borrel Pulse). De vragen moeten leuk en meeslepend zijn.
    `;
    
    try {
        // 4. Roep de Gemini API aan (met JSON output)
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
            }
        });

        // 5. Verwerk de JSON response
        const jsonResponse = JSON.parse(response.text.trim());
        
        // Stuur het geldige JSON-antwoord terug naar de frontend
        return res.status(200).json(jsonResponse);
        
    } catch (error) {
        console.error('Fout bij het genereren van de AI-content:', error);
        // Controleer of het een ongeldige sleutel fout is, anders interne serverfout
        if (error.message && error.message.includes('API key')) {
             return res.status(401).json({ error: 'Gemini API Sleutel is ongeldig of heeft geen rechten.' });
        }
        return res.status(500).json({ 
            error: 'Interne fout bij het genereren van de vraag.', 
            details: error.message 
        });
    }
}