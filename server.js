require("dotenv").config();
var api = "http://localhost:3095/";
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

  socket.on("chat message", (num, name, msg, t_idx, s_idx, mode) => {
    const q_insert = `insert into sos_chat_msg (scr_idx, smt_idx, sms_idx, msg, msg_mode, datetime) select idx,'${t_idx}', '${
      num.split("S")[1]
    }', '${msg}', '${mode}',  now() from sos_chat_room where room_id = '${num}'`;
    connection.query(q_insert, (error, rows, fields) => {
      if (error) throw error;
      console.log(rows, fields);
    });
    const q = `select *,
    (select reg_name from sos_member_student where idx = scr.sms_idx limit 1) as student_name,
    (select reg_name from sos_member_teacher where idx = scr.smt_idx limit 1) as teacher_name,
    (select reg_photo from sos_member_student where idx = scr.sms_idx limit 1) as reg_photo,
    (select reg_photo from sos_member_teacher where idx = scr.smt_idx limit 1) as teacher_photo
    from sos_chat_room as scr
    inner join sos_chat_msg as scm on scr.idx = scm.scr_idx
    where scr.room_id = '${num}'
    order by scm.datetime desc limit 1`;
    connection.query(q, (error, rows, fields) => {
      if (error) throw error;
      console.log(rows[0].student_name);
      io.to(num).emit(
        "chat message",
        name,
        msg,
        t_idx,
        mode,
        q_insert,
        rows[0].student_name,
        rows[0].reg_photo,
        rows[0].teacher_name,
        rows[0].teacher_photo
      );
    });
  });

  socket.on("all chat message", (num, name, msg, t_idx, s_idx, mode) => {
    const q = `select sms.idx as sms_idx, scr.idx as room_idx from sos_member_student as sms
inner join sos_chat_room as scr on sms.idx = scr.sms_idx
where sms.smt_idx = '${t_idx}'`;
    connection.query(q, (error, rows, fields) => {
      if (error) throw error;
      rows.forEach((element) => {
        console.log(element);
        const q_insert = `insert into sos_chat_msg (scr_idx, smt_idx, sms_idx, msg, msg_mode, datetime)
      value ('${element.room_idx}', '${t_idx}', '${element.sms_idx}', '${msg}', 'T', now())`;
        connection.query(q_insert, (error2, rows2, fields2) => {
          if (error2) throw error2;
          console.log("?????????", "T" + t_idx + "S" + element.sms_idx);
          io.to("T" + t_idx + "S" + element.sms_idx).emit(
            "chat message",
            name,
            msg,
            t_idx,
            mode,
            q_insert
          );
        });
      });
      //   if (rows.length === 0) {
      //     const q_insert = `insert into sos_chat_msg (scr_idx, smt_idx, sms_idx, msg, msg_mode, datetime) select idx,'${t_idx}', '${
      //       num.split("S")[1]
      //     }', '${msg}', '${mode}',  now() from sos_chat_room where room_id = '${num}'`;
      //     connection.query(q_insert, (error, rows, fields) => {
      //       if (error) throw error;
      //       console.log(rows, fields);
      // io.to(num).emit("chat message", name, msg, t_idx, mode);
    });
    // }
  });
  // });
});

http.listen(9000, () => {
  console.log("Connect at 9000");
});
