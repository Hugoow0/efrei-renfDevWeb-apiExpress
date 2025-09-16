"use strict";

const express = require("express");
const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 3000;
const HEADWAY_MIN = parseInt(process.env.HEADWAY_MIN) || 3;
const LAST_WINDOW_START = process.env.LAST_WINDOW_START || "00:45";
const SERVICE_END = process.env.SERVICE_END || "01:15";

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
        status: "success",
    });
});

app.get("/next-metro", (req, res) => {
    const station = req.query.station;

    function nextArrival(now = new Date(), headwayMin = HEADWAY_MIN) {
        now.setHours(0, 58, 0, 0); // Lina arrives at 00:58

        const tz = "Europe/Paris";
        const toHM = (d) =>
            String(d.getHours()).padStart(2, "0") +
            ":" +
            String(d.getMinutes()).padStart(2, "0");
        const end = new Date(now);
        end.setHours(1, 15, 0, 0); // 01:15
        const lastWindow = new Date(now);
        lastWindow.setHours(0, 45, 0, 0); // 00:45
        if (now > end) return { service: "closed", tz };
        const next = new Date(now.getTime() + headwayMin * 60 * 1000);

        return {
            nextArrival: toHM(next),
            isLast: now >= lastWindow,
            headwayMin,
            tz,
        };
    }

    if (!station) {
        return res.status(400).json({
            status: "error",
            message: "Station query parameter is required",
        });
    } else {
        const data = nextArrival();
        //console.log("NextMetro:", data);
        const result = {
            status: "success",
            station: station,
            line: "M1",
            headwayMin: data.headwayMin,
            nextArrival: data.nextArrival,
            isLast: data.isLast,
            timezone: data.tz,
        };
        return res.status(200).json(result);
    }
});

app.use((req, res, next) => {
    return res.status(404).json({
        status: "error",
        message: "URL not found",
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
