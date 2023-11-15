//mypage사용
var express = require('express');
var router = express.Router();
var db = require('../db');

//post category별로 select
router.get('/posts.list',function(req,res){
  const user_id = parseInt(req.query.user_id) 
  const menu = req.query.menu
  const size = parseInt(req.query.size) 
  const page = parseInt(req.query.page) 

  const start = (page-1)*size;
  let menuPattern = menu==='0' ||menu==='-1'?`%%`:`%${menu}%`;

  const sql = "select *,date_format(created_at,'%Y-%m-%d') as date,date_format(updated_at,'%Y-%m-%d') as newdate, (select count(*) from posts where user_id = ? and menu like ?) as total from posts where user_id = ? and menu like ? order by updated_at limit ?,? "

  db.get().query(sql,[user_id,menuPattern,user_id,menuPattern,start,size],function(err,rows){
    if (err) {
      console.log("에러: ", err);
      res.status(500).send({ error: "데이터를 불러오는 중 오류가 발생했습니다." });
    } else if (rows.length === 0) {
      console.log(rows);
      res.send({ 'list': rows, 'total': 0 });
    } else {
      res.send({ 'list': rows, 'total': rows[0].total });
    }
    }) 
});

//user별 comment 가져오기
router.get('/comments.list', function(req, res){
  const user_id = req.query.user_id;
  const size = parseInt(req.query.size);
  const page = parseInt(req.query.page);
  const menu = req.query.menu

  let menuPattern = menu==='0' ||menu==='-1'?`%%`:`%${menu}%`;
  const start = (page-1)*size;

  const sql = "select comments.*,date_format(comments.created_at,'%Y-%m-%d') as date,date_format(comments.updated_at,'%Y-%m-%d') as newdate,posts.menu,(select count(*) from comments where user_id = ? and menu like ?) as total from comments,posts where comments.user_id=? and posts.post_id = comments.post_id and posts.menu like ? order by comments.updated_at limit ?,?";
  db.get().query(sql, [user_id,menuPattern,user_id,menuPattern,start,size], function(err, rows){
    if (err) {
      console.log("에러: ", err);
      res.status(500).send({ error: "데이터를 불러오는 중 오류가 발생했습니다." });
    } else if (rows.length === 0) {
      console.log(rows);
      res.send({ 'list': rows, 'total': 0 });
    } else {
      res.send({ 'list': rows, 'total': rows[0].total });
    }
  });
});

//나의활동 scrab data가져오기
router.get('/scraps.list',function(req,res){
  const user_id = parseInt(req.query.user_id);
  const size = parseInt(req.query.size);
  const page = parseInt(req.query.page);
  const menu = req.query.menu
  const start = (page-1)*size;
  
  console.log(menu,user_id,start,size)
  if (menu === '-1' || menu === '0'){
    console.log(menu,user_id,start,size)
    let sql = "call scraps_all(?,?,?)"
    db.get().query(sql, [user_id,page,size], function(err, rows){
      if (err) {
        console.log("에러: ", err);
        res.status(500).send({ error: "데이터를 불러오는 중 오류가 발생했습니다." });
      }else if (rows.length === 0) {
        console.log(rows);
        res.send({ 'list': rows, 'total': 0 });
      } else {
        res.send({ 'list': rows[0], 'total': rows[1][0].total });
        return
      }
    });
  } else if (menu === '9'){
    sql = "SELECT *,(select count(*) from scraps s JOIN contests c ON s.contest_id = c.contest_id where user_id = ?) as total FROM scraps s JOIN contests c ON s.contest_id = c.contest_id where user_id = ? order by created_at limit ?,?;"
    
    db.get().query(sql, [user_id,user_id,start,size], function(err, rows){
      if (err) {
        console.log("에러: ", err);
        res.status(500).send({ error: "데이터를 불러오는 중 오류가 발생했습니다." });
      }else if (rows.length === 0) {
        console.log(rows);
        res.send({ 'list': rows, 'total': 0 });
      } else {
        res.send({ 'list': rows, 'total': rows[0].total });
        return
      }
    });

  } else {
    const menuPattern = `%${menu}%`;
    sql ="SELECT s.*,p.menu,p.title,(select count(*) FROM scraps s JOIN posts p ON s.post_id = p.post_id where s.user_id = ? and menu like ?) as total FROM scraps s JOIN posts p ON s.post_id = p.post_id where s.user_id = ? and menu like ? order by s.created_at limit ?,?;"
  
    db.get().query(sql, [user_id,menuPattern,user_id,menuPattern,start,size], function(err, rows){
      if (err) {
        console.log("에러: ", err);
        res.status(500).send({ error: "데이터를 불러오는 중 오류가 발생했습니다." });
      } else if (rows.length === 0) {
        console.log(rows);
        res.send({ 'list': rows, 'total': 0 });
      }else {
        res.send({ 'list': rows, 'total': rows[0].total });
      }
    });
  }  
})

// 오답노트
router.get('/oxnote.list', function (req, res) {
  const user_id = parseInt(req.query.user_id);
  const size = parseInt(req.query.size);
  const page = parseInt(req.query.page);
  const start = (page - 1) * size;

  const sql = "SELECT n.*,p.title,p.grade_id,g.grade, (SELECT count(*) FROM oxnote n JOIN problems p ON n.problem_id = p.problem_id WHERE n.user_id = '8') as total FROM oxnote n JOIN problems p ON n.problem_id = p.problem_id join grades g on g.grade_id = p.grade_id  WHERE n.user_id = '8' limit 1,10"
  
  db.get().query(sql, [user_id, user_id, start, size], function (err, rows) {
    if (err) {
      console.log("에러: ", err);
      res.status(500).send({ error: "데이터를 불러오는 중 오류가 발생했습니다." });
    } else if (rows.length === 0) {
      console.log('결과없음');
      res.send({ 'list': rows, 'total': 0 });
    } else {
      res.send({ 'list': rows, 'total': rows[0].total });
    }
  });
});

//해당user의 bookmarks_problem data가져오기
router.get('/bookmarks.list', function (req, res) {
  const user_id = parseInt(req.query.user_id);
  const size = parseInt(req.query.size);
  const page = parseInt(req.query.page);
  const grade_id = req.query.grade_id ? `${req.query.grade_id}`: '%%';
  const title = req.query.title ? `%${req.query.title}%`: '%%';
  const tagname = req.query.tagname ? `%${req.query.tagname}%`: '%%';
  const problem_id = req.query.problemid ? `${req.query.problemid}`: '%%';
  console.log(user_id,grade_id,title,tagname,problem_id)
  console.log(size,page)

  const sql = "call bookmark_list(?,?,?,?,?,?,?)"
  
  db.get().query(sql, [user_id,page,size,grade_id,tagname,title,problem_id], function (err, rows) {
    if (err) {
      console.log("에러: ", err);
      res.status(500).send({ error: "데이터를 불러오는 중 오류가 발생했습니다." });
    } else if (rows.length === 0) {
      console.log('결과없음');
      res.send({ 'list': rows, 'total': 0 });
    } else {
      res.send({ 'list': rows[0], 'total': rows[1][0].total });
    }
  });
});


module.exports = router;