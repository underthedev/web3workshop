const express = require('express');

const app = express();

app.get("/", (req, res) => {
    res.send("hello")
})

app.listen(5000, () => {
    console.log("Running on port 5000.")
})

module.export = app;