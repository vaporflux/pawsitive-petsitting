import { GoogleGenAI } from "@google/genai";
import { DayLog, DOGS, TIME_SLOTS, DogName, ActivityType } from "../types";

// Initialize the Gemini client
// Note: In a real deployment, we would handle the API key more securely or via a proxy.
// Since the prompt specifies getting it from process.env, we follow that pattern.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateDailySummary = async (
  dayLog: DayLog,
  dateStr: string,
  sitterName: string
): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
      return "API Key missing. Cannot generate summary.";
    }

    // Construct a prompt based on the day's activities
    const dataSummary = {
      date: dateStr,
      sitter: sitterName,
      dogs: DOGS.map(dog => {
        return {
          name: dog,
          comment: dayLog.comments[dog] || "No specific comments.",
          activities: TIME_SLOTS.map(slot => {
            const slotActivities = slot.activities.map(act => {
              const taskId = `${dateStr}-${slot.id}-${dog}-${act}`;
              const completed = dayLog.tasks[taskId] || false;
              return `${act}: ${completed ? 'Done' : 'Pending'}`;
            });
            return {
              time: slot.label,
              status: slotActivities.join(', ')
            };
          })
        };
      })
    };

    const prompt = `
      You are a friendly AI assistant for a pet sitting app.
      Here is the data for today (${dateStr}) logged by the sitter, ${sitterName}.
      
      Data: ${JSON.stringify(dataSummary, null, 2)}
      
      Please write a warm, cheerful, and concise daily summary for the owner (approx 100 words). 
      Highlight if the dogs ate well and went to the bathroom regularly. 
      Incorporate the specific comments provided by the sitter naturally into the narrative.
      Make it sound like a fun report card.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "An error occurred while generating the daily summary. Please try again.";
  }
};