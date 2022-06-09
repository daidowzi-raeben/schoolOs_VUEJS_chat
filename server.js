require("dotenv").config();
const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });
const mysql = require("mysql"); // mysql 모듈 로드
const conn = {
  // mysql 접속 설정
  host: process.env.CLIENT_HOST,
  port: process.env.CLIENT_PORT,
  user: process.env.CLIENT_USER,
  password: process.env.CLIENT_PW,
  database: process.env.CLIENT_DB,
};

const connection = mysql.createConnection(conn); // DB 커넥션 생성
connection.connect();

app.set("view engine", "ejs");
app.set("views", "./views");

// let room = ["room1", "room2"];

app.get("/", (req, res) => {
  res.render("chat");
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("leaveRoom", (num, name) => {
    socket.leave(room[num], () => {
      console.log(name + " leave a " + room[num]);
      io.to(room[num]).emit("leaveRoom", num, name);
    });
  });

  socket.on("joinRoom", (num, name, smt, sms) => {
    sms_idx = num.split("S")[1];
    const q = `SELECT room_id from sos_chat_room where room_id = '${num}'`;
    connection.query(q, (error, rows, fields) => {
      if (error) throw error;
      if (rows.length === 0) {
        const q_insert = `insert into sos_chat_room (room_id, smt_idx, sms_idx, datetime) value ('${num}', '${smt}', ${sms_idx}, now())`;
        connection.query(q_insert, (error, rows, fields) => {
          if (error) throw error;
          console.log(rows, fields);
        });
      }
    });
    socket.join(num, () => {
      io.to(num).emit("joinRoom", num, name);
    });
  });

  socket.on("chat message", (num, name, msg, t_idx, s_idx) => {
    const q_insert = `insert into sos_chat_msg (scr_idx, smt_idx, sms_idx, msg, datetime) select idx,'${t_idx}', '${
      num.split("S")[1]
    }', '${msg}', now() from sos_chat_room where room_id = '${num}'`;
    connection.query(q_insert, (error, rows, fields) => {
      if (error) throw error;
      console.log(rows, fields);
    });
    io.to(num).emit("chat message", name, msg, t_idx);
  });
});

http.listen(9000, () => {
  console.log("Connect at 9000");
});
