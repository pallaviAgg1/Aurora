const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { Configuration, OpenAIApi } = require("openai");

admin.initializeApp();

exports.calculateAdaptiveWakeUpTime = functions.https.onCall(async (data, context) => {
    const { userId, alarmTime, address, destination, date } = data;
    try {
        const googleMapsResponse = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json`, {
            params: {
                origins: address,
                destinations: destination,
                departure_time: "now",
                key: "" // no key right now
            }
        });
        const trafficTimeInSeconds = googleMapsResponse.data.rows[0].elements[0].duration_in_traffic.value;
        const trafficTimeInMinutes = Math.ceil(trafficTimeInSeconds / 60);
        console.log("Traffic time fetched:", trafficTimeInMinutes, "minutes");
        const googleCalendarResponse = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
            headers: {
                Authorization: `Bearer ' // no key right now
            }
        });
        const events = googleCalendarResponse.data.items.filter(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date);
            return eventDate.toDateString() === new Date(date).toDateString();
        });
        console.log("Calendar events fetched:", events);
        const fitbitResponse = await axios.get(`https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`, {
            headers: {
                Authorization: `Bearer ` // no key right now
            }
        });
        const sleepData = fitbitResponse.data.sleep[0];
        console.log("Sleep data fetched:", sleepData);
        const configuration = new Configuration({
            apiKey: "" // no key right now
        });
        const openai = new OpenAIApi(configuration);

        const prompt = `
            You are with calculating an adaptive wake-up time for a user based on their location, calendar events, sleep data, and traffic conditions. 
            Here is the data you need to consider:

            1. **Traffic Data**:
            - Estimated commute time in traffic: ${trafficTimeInMinutes} minutes

            2. **Calendar Events**:
            - Events: ${events.map(event => `Title: ${event.summary}, Start: ${event.start.dateTime || event.start.date}, End: ${event.end.dateTime || event.end.date}`).join("\n   - ")}

            3. **Sleep Data**:
            - Start Time: ${sleepData.startTime}
            - End Time: ${sleepData.endTime}
            - Duration (minutes): ${sleepData.minutesAsleep}
            - Efficiency: ${sleepData.efficiency}

            4. **Alarm Time**:
            - User's set alarm time: ${alarmTime}

            Consider the following:
            - The user should wake up with enough time to prepare for their earliest calendar event.
            - If the user had poor sleep efficiency (<85%), suggest a slightly later wake-up time to improve rest.
            - Factor in the commute time in traffic to ensure the user arrives on time for their first event.
            - Provide a clear explanation for your suggested wake-up time.

            What is the optimal wake-up time for the user? Provide the time in the format "HH:MM:SS" in 24-hour format.
        `;

        const chatGPTResponse = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            max_tokens: 300,
            temperature: 0.7
        });
        const adaptiveWakeUpTime = chatGPTResponse.data.choices[0].text.trim();
        console.log(`Adaptive Wake-Up Time for User ${userId}: ${adaptiveWakeUpTime}`);
        return {
            success: true,
            adaptiveWakeUpTime: adaptiveWakeUpTime
        };
    } catch (error) {
        console.error("Error calculating adaptive wake-up time:", error);
        return {
            success: false,
            error: error.message
        };
    }
});