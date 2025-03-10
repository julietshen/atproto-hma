app.get(\"/xrpc/_health\", (req, res) => { res.json({ status: \"ok\", version: \"1.0.0\" }); });
