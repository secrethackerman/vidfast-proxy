// server.js
import express from "express";
import puppeteer from "puppeteer";

const app = express();

app.get("/fetch", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing url");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  const content = await page.content();

  await browser.close();
  res.send(content);
});

app.listen(3000, () => console.log("Proxy running on port 3000"));
