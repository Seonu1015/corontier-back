var express = require('express');
var router = express.Router();
var db = require('../db');

//태그 list.json
//localhost:5000/project/taglist.json?
router.get('/taglist.json', function (req, res) {
    const sql = 'select * from tags where tag_type_id=2 or tag_type_id=3';
    db.get().query(sql, function (err, rows) {
        if (err) console.log('.........', err);
        res.send(rows);
    });
});

//게시글 list.json
//localhost:5000/project/postlist.json?menu=1
router.get('/postlist.json', function (req, res) {
    const menu = req.query.menu;
    const sql = 'select * from posts where menu=?';
    db.get().query(sql, [menu], function (err, rows) {
        if (err) console.log('.........', err);
        res.send(rows);
    });
});

//프로젝트글 list.json
//localhost:5000/project/projectlist.json?menu=1
router.get('/projectlist.json', function (req, res) {
    const menu = req.query.menu;
    const sql = 'SELECT po.*, pr.* FROM posts po left join projects pr on po.post_id = pr.post_id where po.menu=1';
    db.get().query(sql, function (err, rows) {
        if (err) console.log('.........', err);
        res.send(rows);
    });
});


//프로젝트글 한개씩 가져옴
//localhost:5000/project/projectpick.json?post_id=2
router.get('/projectpick.json', function (req, res) {
    const post_id = req.query.post_id;
    const sql = 'SELECT po.*, pr.*, u.nickname FROM posts po inner join projects pr on po.post_id = pr.post_id inner join users u on po.user_id = u.user_id where po.menu = 1 and po.post_id = ?';
    db.get().query(sql, [post_id], function (err, rows) {
        if (err) console.log('.........', err);
        res.send(rows[0]);
    });
});

//프로시저 사용해보자
//localhost:5000/project/prcedures?post_id=240&page=1&size=9
router.get('/prcedures', function (req, res) {
    const post_id = req.query.post_id;
    const page = req.query.page;
    const size = req.query.size;
    const sql = 'call project_list(?, ?, ?)';
    db.get().query(sql, [post_id, page, size], function (err, rows) {
        if (err) console.log('.........', err);
        res.send({
            listAll: rows[0],
            listOne: rows[1][0],
            total: rows[2][0].total,
            postTags: rows[3]
        });
    });
});

//댓글 list.json
//localhost:5000/project/commentslist.json?post_id=72
router.get('/commentslist.json', function (req, res) {
    const post_id = req.query.post_id;
    const sql = 'call project_comments_list(?)';
    db.get().query(sql, [post_id], function (err, rows) {
        if (err) console.log('.........', err);
        res.send(rows[0]);
    });
});

//프로젝트 상세페이지 태그.json
//localhost:5000/project/projecttag.json?post_id=240
router.get('/projecttag.json', function (req, res) {
    const post_id = req.query.post_id;
    const sql = 'call project_tag(?)';
    db.get().query(sql, [post_id], function (err, rows) {
        if (err) console.log('.........', err);
        res.send(rows[0]);
    });
});

//게시글 태그 검색용
//localhost:5000/project/tagsearch.json?tag_id=39
router.get('/tagsearch.json', function (req, res) {
    const tag_id = req.query.tag_id;
    const sql = 'select pt.*, t.tag_id from post_tags pt join tags t on pt.tag_name = t.tag_name where tag_id = ?';
    db.get().query(sql, [tag_id], function (err, rows) {
        if (err) console.log('.........', err);
        res.send(rows);
    });
});

//게시글 태그 검색용 다시
//localhost:5000/project/searchbytag.json?tag_name=TypeScript&page=1&size=9
router.get('/searchbytag.json', function (req, res) {
    const tag_name = req.query.tag_name;
    const page = req.query.page;
    const size = req.query.size;
    const sql = 'call project_search_tag(?, ?, ?)';
    db.get().query(sql, [tag_name, page, size], function (err, rows) {
        if (err) console.log('.........', err);
        res.send(rows[0]);
    });
});

module.exports = router;