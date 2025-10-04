import crypto from "crypto";

function generateKeys() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  console.log("\n✅ Successfully generated RSA key pair.");
  console.log(
    "\n📋 Copy the following lines and paste them into your `backend/.env` file:\n"
  );
  console.log(
    "-----------------------------------------------------------------"
  );
  console.log(`LICENSE_PRIVATE_KEY="${privateKey.replace(/\n/g, "\\n")}"`);
  console.log(`LICENSE_PUBLIC_KEY="${publicKey.replace(/\n/g, "\\n")}"`);
  console.log(
    "-----------------------------------------------------------------"
  );
}

generateKeys();
