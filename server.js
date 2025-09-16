"use strict";

const express = require("express");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const HEADWAY_MIN = parseInt(process.env.HEADWAY_MIN) || 3;
const LAST_WINDOW_START = process.env.LAST_WINDOW_START || "00:45";
const SERVICE_END = process.env.SERVICE_END || "01:15";
const SERVICE_START = process.env.SERVICE_START || "05:30";

// Parse time string in format "HH:MM" to hours and minutes
function parseTimeString(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return { hours, minutes };
}

// Service boundaries
const lastWindowStart = parseTimeString(LAST_WINDOW_START);
const serviceEnd = parseTimeString(SERVICE_END);
const serviceStart = parseTimeString(SERVICE_START);

// Add CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

app.use((req, res, next) => {
    const t0 = Date.now();
    res.on("finish", () => {
        const t1 = Date.now();
        const duration = t1 - t0;
        console.log(
            `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
        );
    });
    next();
});

app.get("/health", (req, res) => {
    return res.status(200).json({
        status: "ok",
    });
});

app.get("/next-metro", (req, res) => {
    const station = req.query.station;

    function nextArrival(now = new Date(), headwayMin = HEADWAY_MIN) {
        const tz = "Europe/Paris";
        const toHM = (d) =>
            String(d.getHours()).padStart(2, "0") +
            ":" +
            String(d.getMinutes()).padStart(2, "0");

        // Service hours: SERVICE_START to SERVICE_END (next day)
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Check if service is closed
        // Service is closed between SERVICE_END and SERVICE_START
        const isServiceClosed =
            (hours === serviceEnd.hours && minutes > serviceEnd.minutes) || // After service end
            (hours > serviceEnd.hours && hours < serviceStart.hours) || // Between service end and start
            (hours === serviceStart.hours && minutes < serviceStart.minutes); // Before service start

        if (isServiceClosed) {
            return { service: "closed", tz };
        }

        const end = new Date(now);
        end.setHours(serviceEnd.hours, serviceEnd.minutes, 0, 0);
        const lastWindow = new Date(now);
        lastWindow.setHours(
            lastWindowStart.hours,
            lastWindowStart.minutes,
            0,
            0
        );

        // Last train window is between LAST_WINDOW_START and SERVICE_END
        const isLastTrain =
            (hours === lastWindowStart.hours &&
                minutes >= lastWindowStart.minutes) ||
            (hours > lastWindowStart.hours && hours < serviceEnd.hours) ||
            (hours === serviceEnd.hours && minutes <= serviceEnd.minutes);

        const next = new Date(now.getTime() + headwayMin * 60 * 1000);

        return {
            nextArrival: toHM(next),
            isLast: isLastTrain,
            headwayMin,
            tz,
        };
    }

    if (!station) {
        return res.status(400).json({
            error: "missing station",
        });
    } else {
        const data = nextArrival();

        if (data.service === "closed") {
            return res.status(200).json({
                service: "closed",
                tz: data.tz,
            });
        }

        const result = {
            station: station,
            line: "M1",
            headwayMin: data.headwayMin,
            nextArrival: data.nextArrival,
            isLast: data.isLast,
            tz: data.tz,
        };
        return res.status(200).json(result);
    }
});

app.use((req, res) => {
    return res.status(404).json({
        error: "not found",
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
