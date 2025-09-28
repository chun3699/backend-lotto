import express from "express";
import { conn } from "../dbconnect";
import { User } from "../model/user";
import mysql from "mysql2/promise";
import util from "util";


export const queryAsync = util.promisify(conn.query).bind(conn);
export const router = express.Router();


router.get('/',(req,res)=>{
    res.send("Get in lotto.ts")
});


router.get("/all", async (req, res) => {
  try {
    const [rows] = await conn.query("SELECT * FROM `lotto`");
    res.json(rows);
    console.log("rows:", rows);
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Database error");
  }
});


router.get("/lotto_id/:id",async(req,res)=>{
    try {
    const id = req.params.id;


    const [rows] = await conn.query("SELECT * FROM `lotto` WHERE lotto_id = ?", [id]);


    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------
// ฟังก์ชันสุ่มเลข 6 หลัก (string)
// --------------------
function randomLottoNumber(): string {
  const num = Math.floor(Math.random() * 1000000); // 0 - 999999
  return num.toString().padStart(6, '0');          // เติมเลข 0 ด้านหน้าให้ครบ 6 หลัก
}

// --------------------
// 1️⃣ สร้างล็อตเตอรี่
// --------------------
router.post("/generate", async (req, res) => {
  const count = parseInt(req.body.count, 10); // ดึงจำนวนล็อตเตอรี่จาก body และแปลงเป็น number

  if (!count || count <= 0) {                 // ตรวจสอบจำนวนถูกต้อง
    return res.status(400).json({ error: "กรุณาระบุจำนวนที่ถูกต้อง" });
  }

  const created: string[] = [];               // เก็บเลขล็อตเตอรี่ที่สร้างสำเร็จ
  let attempts = 0;                            // นับจำนวนครั้งสุ่ม เพื่อป้องกัน loop ไม่จบ

  try {
    while (created.length < count && attempts < 10000) { // สุ่มจนกว่าจะครบ count หรือเกิน 10000 ครั้ง
      const lottoNumber = randomLottoNumber();           // สุ่มเลขใหม่ 6 หลัก

      try {
        // insert ลง DB เป็น string
        const [result]: any = await conn.query(
          "INSERT INTO lotto (number, price, status, user_id) VALUES (?, 100, 'unsold', NULL)",
          [lottoNumber]
        );

        if (result.affectedRows > 0) {
          created.push(lottoNumber); // insert สำเร็จ → เก็บเลข
        }
      } catch (err: any) {
        // ถ้าเลขซ้ำ (duplicate) → ข้ามไปสุ่มใหม่
        if (err.code !== "ER_DUP_ENTRY") {
          console.error("❌ Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }
      }

      attempts++; // เพิ่มตัวนับ
    }

    if (created.length < count) { // ถ้าไม่สามารถสร้างครบตามที่ขอ
      return res.status(409).json({ error: "สุ่มหมายเลขไม่ครบตามที่ขอ" });
    }

    // ส่งเลขล็อตเตอรี่ที่สร้างสำเร็จกลับไป
    res.json({ lotto: created });
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------
// 2️⃣ ซื้อล็อตเตอรี่
// --------------------
router.post("/buy", async (req, res) => {
  try {
    const { user_id, lotto_id } = req.body;


    if (!user_id || !lotto_id) {
      return res.status(400).json({ error: "Missing user_id or lotto_id" });
    }


    // 1. ตรวจสอบยอดเงินปัจจุบันของ user
    const [users]: any = await conn.query(
      "SELECT user_wallet FROM user WHERE user_id = ?",
      [user_id]
    );


    if (users.length === 0) {
      return res.status(404).json({ error: "ไม่พบ user" });
    }


    const currentWallet = users[0].user_wallet;


    // 2. เช็คว่าเงินพอหรือไม่
    if (currentWallet < 100) {
      return res.json({ message: "ยอดเงินไม่เพียงพอในการซื้อสลาก", user_wallet: currentWallet });
    }


    // 3. อัปเดตหักเงิน 100 บาท
    await conn.query(
      "UPDATE user SET user_wallet = user_wallet - 100 WHERE user_id = ?",
      [user_id]
    );


    // 4. อัปเดตสถานะสลากจาก unsold → sold (และกำหนด user_id)
    const [result]: any = await conn.query(
      "UPDATE lotto SET user_id = ?, status = 'sold' WHERE lotto_id = ? AND status = 'unsold'",
      [user_id, lotto_id]
    );


    // เช็คว่า update สลากสำเร็จไหม
    if (result.affectedRows === 0) {
      return res.json({ message: "สลากนี้ถูกขายไปแล้ว" });
    }


    // 5. ส่ง response กลับ
    res.json({
      message: "ซื้อสลากสำเร็จ",
      user_wallet: currentWallet - 100
    });


  } catch (error) {
    console.error("❌ Error in /buy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// --------------------
// 3️⃣ ดูล็อตเตอรี่ที่ยังไม่ขาย
// --------------------
router.get("/unsold", async (req, res) => {
  try {
    const [rows] = await conn.query(
      "SELECT * FROM lotto WHERE status = 'unsold'"
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------
// 3️⃣ ดูล็อตเตอรี่ที่ขายแล้ว
// --------------------
router.get("/sold", async (req, res) => {
  try {
    const [rows] = await conn.query(
      "SELECT * FROM lotto WHERE status = 'sold'"
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --------------------
// ลบล็อตเตอรี่ทั้งหมด + รางวัลทั้งหมด + prize + user (customer)
// --------------------
router.delete("/delete_all", async (req, res) => {
  try {
    // 1️⃣ ลบ child ก่อน (lotto_wins_prize)
    await conn.query("DELETE FROM lotto_wins_prize");

    // 2️⃣ ลบ parent (lotto)
    await conn.query("DELETE FROM lotto");

    // 3️⃣ รีเซ็ต AUTO_INCREMENT ของ lotto และ lotto_wins_prize
    await conn.query("ALTER TABLE lotto AUTO_INCREMENT = 1");
    await conn.query("ALTER TABLE lotto_wins_prize AUTO_INCREMENT = 1");

    // 4️⃣ ลบ prize ทั้งหมด
    await conn.query("DELETE FROM prize");
    await conn.query("ALTER TABLE prize AUTO_INCREMENT = 1");

    // 5️⃣ ลบ user ทั้งหมดที่เป็น customer
    await conn.query("DELETE FROM user WHERE user_role = 'customer'");
    await conn.query("ALTER TABLE user AUTO_INCREMENT = 1");

    res.json({ message: "ลบล็อตเตอรี่, รางวัล, prize และผู้ใช้ customer ทั้งหมดเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//ค้นหา lotto ด้วยเลข
router.post("/search", async (req, res) => {
  try {
    const { number } = req.body; // ✅ รับค่าหมายเลขจาก body


    if (!number) {
      return res.status(400).json({ error: "Missing lotto number" });
    }


    // ✅ Query หาลอตเตอรี่ที่มีเลขบางส่วนตรงกับที่ส่งมา
    const [rows]: any = await conn.query(
      "SELECT * FROM lotto WHERE CAST(number AS CHAR) LIKE ?",
      [`%${number}%`]   // ตรงนี้แทน '%71%'
    );


    if (rows.length === 0) {
      return res.status(404).json({ error: "Lotto number not found" });
    }


    res.json(rows); // ถ้า unique จะได้ 1 record, ถ้าไม่ unique ได้ทั้งหมด
  } catch (error) {
    console.error("❌ Error searching lotto:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/user", async (req,res)=>{
    try{
        const { user_id } = req.body;
        const [rows] = await conn.query("SELECT * FROM `lotto` WHERE user_id = ?"
            ,[user_id]
        )
        res.json(rows);
    }catch(error){
        console.error("❌ Database error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


