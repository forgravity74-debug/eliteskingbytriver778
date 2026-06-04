import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Verify BGMI Player ID using Rooter API (real in-game name lookup)
  app.post("/api/verify-player", async (req, res) => {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: "Player ID is required" });
    }

    if (!/^\d{8,12}$/.test(playerId)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid Player ID format. Must be 8-12 digits." 
      });
    }

    try {
      console.log(`[verify-player] Fetching real BGMI name for ID: ${playerId}`);
      
      // Step 1: Get auth token from Rooter.gg
      const rooterResponse = await axios.get("https://www.rooter.gg/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
        timeout: 10000,
      });

      const setCookies = rooterResponse.headers["set-cookie"];
      let accessToken = "";

      if (setCookies) {
        for (const cookie of setCookies) {
          if (cookie.includes("user_auth=")) {
            const match = cookie.match(/user_auth=([^;]+)/);
            if (match) {
              try {
                const decoded = decodeURIComponent(match[1]);
                const authData = JSON.parse(decoded);
                accessToken = authData.accessToken || "";
              } catch {}
            }
            if (accessToken) break;
          }
        }
      }

      if (!accessToken) {
        console.error("[verify-player] Failed to obtain Rooter auth token");
        return res.status(502).json({ 
          success: false, 
          error: "Verification service temporarily unavailable. Please try again." 
        });
      }

      // Step 2: Query BGMI username via Rooter Bazaar API
      const usernameResponse = await axios.get(
        `https://bazaar.rooter.io/order/getUnipinUsername?gameCode=BGMI_IN&id=${playerId}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Device-Type": "web",
            "App-Version": "1.0.0",
            "Device-Id": "eliteskins-verify",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
          },
          timeout: 10000,
        }
      );

      const data = usernameResponse.data;
      console.log(`[verify-player] Rooter API response:`, JSON.stringify(data));

      if (data.transaction === "SUCCESS" && data.unipinRes?.username) {
        res.json({ 
          success: true, 
          name: data.unipinRes.username,
          message: "ID Verified" 
        });
      } else {
        res.status(404).json({ 
          success: false, 
          error: data.message || "Player not found. Please check the UID and try again." 
        });
      }
    } catch (error: any) {
      console.error("[verify-player] Error:", error.message);
      if (error.response?.status === 404 || error.response?.data?.transaction === "FAILED") {
        return res.status(404).json({ 
          success: false, 
          error: "Player not found. Please check the UID and try again." 
        });
      }
      res.status(500).json({ 
        success: false, 
        error: "Verification service error. Please try again." 
      });
    }
  });

  // Create Payment Order via JazPays Gateway
  app.post("/api/create-payment", async (req, res) => {
    const { playerId, packageId, amount, price, name, email, phone } = req.body;

    if (!playerId || !packageId || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // JazPays Production Credentials
      const JAZPAYS_CONFIG = {
        baseUrl: "https://api.jazpays.com/v1/create",
        merchantId: process.env.JAZPAYS_MERCHANT_ID || "100222049",
        apiKey: process.env.JAZPAYS_API_KEY || "b54849355bc9fe4b4ab33923e251c89d",
      };

      const siteUrl = process.env.APP_URL || `http://localhost:${PORT}`;
      const callbackUrl = `${siteUrl}/api/payment-callback`;
      const merchantOrderNo = `ES_${playerId}_${Date.now()}`;
      const paymentAmount = parseFloat(String(price)).toFixed(2);

      // JazPays Signature Generation:
      // 1. Collect: merchant_id, amount, merchant_order_no, callback_url
      // 2. Sort alphabetically by key: amount → callback_url → merchant_id → merchant_order_no
      // 3. Build string: amount=X&callback_url=X&merchant_id=X&merchant_order_no=X
      // 4. Append secret: &key=API_KEY
      // 5. MD5 hash the final string
      const signParams: Record<string, string> = {
        amount: paymentAmount,
        callback_url: callbackUrl,
        merchant_id: JAZPAYS_CONFIG.merchantId,
        merchant_order_no: merchantOrderNo,
      };

      // Sort keys alphabetically and build the sign string
      const sortedKeys = Object.keys(signParams).sort();
      const signString = sortedKeys.map(k => `${k}=${signParams[k]}`).join("&");
      const finalSignString = `${signString}&key=${JAZPAYS_CONFIG.apiKey}`;
      const signature = crypto.createHash("md5").update(finalSignString).digest("hex");

      console.log(`[create-payment] JazPays payment for Player: ${playerId}, Amount: ₹${paymentAmount}, Order: ${merchantOrderNo}`);
      console.log(`[create-payment] Sign string: ${signString}&key=***`);

      // Build JSON request body for JazPays
      const requestBody = {
        merchant_id: JAZPAYS_CONFIG.merchantId,
        amount: paymentAmount,
        merchant_order_no: merchantOrderNo,
        callback_url: callbackUrl,
        api_key: JAZPAYS_CONFIG.apiKey,
        signature: signature,
      };

      // Call JazPays API
      const gatewayResponse = await axios.post(JAZPAYS_CONFIG.baseUrl, requestBody, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      });

      const data = gatewayResponse.data;
      console.log(`[create-payment] JazPays response:`, JSON.stringify(data));

      // JazPays returns a payment URL for redirect
      if (data.status === "success" && (data.payurl || data.pay_url || data.payment_url || data.url)) {
        const payUrl = data.payurl || data.pay_url || data.payment_url || data.url;
        res.json({
          success: true,
          paymentUrl: payUrl,
          orderId: merchantOrderNo,
          method: "redirect",
        });
      } else {
        console.error(`[create-payment] JazPays error:`, data.message || JSON.stringify(data));
        res.status(400).json({
          success: false,
          error: data.message || "Payment gateway temporarily unavailable. Please try again.",
        });
      }
    } catch (error: any) {
      console.error("[create-payment] Error:", error.message);
      if (error.response) {
        console.error("[create-payment] Response:", JSON.stringify(error.response.data));
      }
      res.status(500).json({ error: "Failed to create payment order. Please try again." });
    }
  });

  // JazPays Payment Webhook Callback Handler
  // Payload: { orderNo, merchantOrder, status, amount, signature }
  app.post("/api/payment-callback", async (req, res) => {
    const params = req.body;
    console.log(`[payment-callback] JazPays webhook received:`, JSON.stringify(params));

    try {
      const gatewayOrderNo = params.orderNo || "";
      const merchantOrder = params.merchantOrder || params.merchant_order_no || "";
      const status = params.status || "";
      const paymentAmount = params.amount || "";
      const callbackSignature = params.signature || "";

      console.log(`[payment-callback] Gateway Order: ${gatewayOrderNo}, Merchant Order: ${merchantOrder}, Status: ${status}, Amount: ${paymentAmount}`);

      // Validate: status must be "success"
      if (status === "success") {
        console.log(`[payment-callback] ✅ Payment SUCCESS for order: ${merchantOrder} (Gateway: ${gatewayOrderNo}), Amount: ₹${paymentAmount}`);
        // TODO: Mark order as paid in your database, trigger skin delivery, etc.
      } else {
        console.log(`[payment-callback] ❌ Payment FAILED/PENDING for order: ${merchantOrder}, Status: ${status}`);
      }

      // Return "success" to acknowledge receipt and stop JazPays retries
      res.send("success");
    } catch (error) {
      console.error("[payment-callback] Error processing webhook:", error);
      res.status(500).send("error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
