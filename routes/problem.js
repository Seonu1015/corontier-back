var express = require('express');
var router = express.Router();
var db = require('../db');

// 문제 list.json
router.get('/list.json', function (req, res) {
    const query = req.query.query || '';
    const page = req.query.page || 1;
    const size = req.query.size || 10;
    const sql = 'call p_list_query(?, ?, ?)';
    db.get().query(sql, [query, page, size], function (err, rows) {
        res.send({ list: rows[0], total: rows[1][0].total });
    });
});

// 문제 태그 리스트
router.get('/tag/list.json', function (req, res) {
    const sql = 'select * from tags where tag_type_id = 1';
    db.get().query(sql, function (err, rows) {
        res.send(rows);
    });
});

// 태그로 문제 검색
router.get('/by_tag/:tag_id', function(req, res) {
    const tag_id = req.params.tag_id;
    const page = req.query.page || 1;
    const size = req.query.size || 10;
    
    const sql = 'call p_list_bytag(?, ?, ?)';
    db.get().query(sql, [tag_id, page, size], function(err, rows) {
        res.send({list:rows[0], total:rows[1][0].total});
    });
});

// 난이도 리스트
router.get('/grade/list.json', function (req, res) {
    const sql = 'select * from grades';
    db.get().query(sql, function (err, rows) {
        res.send(rows);
    });
});

// 난이도로 문제 검색
router.get('/by_grade/:grade_id', function(req, res) {
    const grade_id = req.params.grade_id;
    const page = req.query.page || 1;
    const size = req.query.size || 10;
    
    const sql = 'call p_list_bygrade(?, ?, ?)';
    db.get().query(sql, [grade_id, page, size], function(err, rows) {
        res.send({list:rows[0], total:rows[1][0].total});
    });
});

// 문제 등록
router.post('/insert', function (req, res) {
    const { title, content, input, output, grade_id } = req.body;
    let sql = 'insert into problems (title, content, input, output, grade_id) values ('
    db.get().query(sql, [title, content, input, output, grade_id], function (err) {
        if (!err) {
            sql = 'select last_insert_id() from problems';
            db.get().query(sql, function (err, rows) {
                res.send({ last: rows[0].last });
            });
        } else {
            res.send('0');
        }
    });
});

// 문제 태그 등록
router.post('/insert/tags', function (req, res) {
    const problem_id = req.body.problem_id;
    const tag_ids = req.body.tag_ids;

    const sql = 'insert into problem_tags (problem_id, tag_id) values (?, ?)';
    tag_ids.forEach(tag_id => {
        console.log()
        db.get().query(sql, [problem_id, tag_id], function (err) {
            if (err) {
                res.send('0')
            } else {
                res.send('1')
            }
        });
    });
});

// 문제 풀이 페이지
router.get('/:problem_id', function (req, res) {
    const problem_id = req.params.problem_id;
    const sql = 'select * from problems where problem_id = ?';
    db.get().query(sql, [problem_id], function (err, rows) {
        res.send(rows[0]);
    });
});

const { spawn } = require('child_process');
const { exec } = require('child_process');
const { execFile } = require('child_process');

// 입력받은 코드 실행
router.post('/execute', function (req, res) {
    const { code, language } = req.body;
    let executionResult = '';

    const handlePythonExecution = () => {
        const pythonProcess = spawn('python', ['-c', code]);

        pythonProcess.stdout.on('data', (data) => {
            executionResult += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            executionResult += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                executionResult = executionResult.replace(/\r?\n|\r/g, "");
                console.log('파이썬 입력코드 실행 결과값\n' + executionResult);
                res.send(executionResult);
            } else {
                const errorMessage = `Execution failed with code ${code}`;
                console.log(errorMessage);
                res.send(errorMessage);
            }
        });
    };

    const handleJavascriptExecution = () => {
        try {
            const result = eval(code);
            executionResult = result.toString();
            console.log('자바스크립트 입력코드 실행 결과값 :', executionResult);
            res.send(executionResult);
        } catch (error) {
            executionResult = `Error: ${error.message}`;
            res.send(executionResult);
        }
    };

    switch (language) {
        case 'python':
            handlePythonExecution();
            break;
        case 'javascript':
            handleJavascriptExecution();
            break;
        default:
            const errorMessage = 'Unsupported language';
            console.log(errorMessage);
            res.send(errorMessage);
    }
});

// 풀이 등록
router.post('/insert/solution', function (req, res) {
    const problem_id = req.body.problem_id;
    const content = req.body.content;
    const complete = req.body.complete;
    const user_id = req.body.user_id;
    const language = req.body.language
    // console.log(problem_id, content, complete, user_id);

    const sql = 'insert into solutions (problem_id, content, sel_language, complete, user_id) values (?, ?, ?, ?, ?)';
    db.get().query(sql, [problem_id, content, language, complete, user_id], function (err) {
        if (err) {
            console.error('풀이 등록 오류 : ', err);
            res.send('0');
        } else {
            res.send('1');
        }
    });
});

// 풀이 리스트 - 사용자 기준
router.get('/sol.json/:user_id', function (req, res) {
    const user_id = req.params.user_id;
    const page = req.query.page;
    const size = req.query.size;

    const sql = 'call user_solution_list(?,?,?)';
    db.get().query(sql, [user_id, page, size], function (err, rows) {
        res.send({ list: rows[0], total: rows[1][0].total });
    });
});

// 풀이 댓글 리스트
router.get('/sol_cmnt.json/:sol_id', function (req, res) {
    const sol_id = req.params.sol_id;
    const page = req.query.page;
    const size = req.query.size;

    const sql = "call user_solcmnt_list(?, ?, ?)";
    db.get().query(sql, [sol_id, page, size], function (err, rows) {
        res.send({list:rows[0], total:rows[1][0].total});
    });
});

// 풀이 댓글 등록
router.post('/sol_cmnt/insert', function (req, res) {
    const user_id = req.body.user_id;
    const sol_id = req.body.sol_id;
    const content = req.body.content;

    const sql = 'insert into comments(user_id, sol_id, content) values(?,?,?)';
    db.get().query(sql, [user_id, sol_id, content], function(err) {
        if(err) {
            res.send('0');
        } else {
            res.send('1');
        }
    });
});

// 풀이 댓글 삭제
router.post('/sol_cmnt/delete', function(req, res) {
    const comment_id = req.body.comment_id;
    const sql = 'delete from comments where comment_id=?';
    db.get().query(sql, [comment_id], function(err) {
        if(err) {
            res.send('0');
        } else {
            res.send('1');
        }
    });
});

// 풀이 제출 여부 확인 - 다른 사람 풀이 볼 수 있는지 체크
router.get('/submit/list.json', function (req, res) {
    const user_id = req.query.user_id;
    const problem_id = req.query.problem_id;

    const sql = 'select count(*) submitcnt from solutions where problem_id = ? and user_id = ?';
    db.get().query(sql, [problem_id, user_id], function (err, rows) {
        res.send(rows[0]);
    });
});

// 풀이 리스트 - 문제 기준
router.get('/others/list.json', function(req, res) {
    const problem_id = req.query.problem_id;
    const page = req.query.page || 1;
    const size = req.query.size || 5;
    const sql = 'call solution_list(?, ?, ?)';
    db.get().query(sql, [problem_id, page, size], function(err, rows) {
        res.send({list:rows[0], total:rows[1][0].total});
    });
});

// 문제 푼 상태 체크
router.get('/clear/:user_id', function(req, res) {
    const user_id=req.params.user_id;
    const sql = 'call user_clear_data(?)';
    db.get().query(sql, [user_id], function(err, rows) {
        res.send({list:rows[0], user:rows[1][0], clearcnt:rows[2][0]});
    });
});

// 북마크 여부
router.get('/bookmarkox/list.json', function(req, res) {
    const user_id = req.query.user_id;
    const problem_id = req.query.problem_id;
    const sql = 'select count(*) bookmark from bookmarks_problem where user_id=? and problem_id=?';
    db.get().query(sql, [user_id, problem_id], function(err, rows) {
        res.send(rows[0])
    });
});

// 북마크 추가
router.post('/bookmark/insert', function(req, res) {
    const user_id = req.body.user_id;
    const problem_id = req.body.problem_id;

    const sql = 'insert into bookmarks_problem(user_id, problem_id) values(?, ?)';
    db.get().query(sql, [user_id, problem_id], function(err) {
        if (err) {
            res.send('0');
        } else {
            res.send('1');
        }
    });
});

// 북마크 삭제
router.post('/bookmark/delete', function(req, res) {
    const user_id = req.body.user_id;
    const problem_id = req.body.problem_id;

    const sql = 'delete from bookmarks_problem where user_id=? and problem_id=?';
    db.get().query(sql, [user_id, problem_id], function(err) {
        if (err) {
            res.send('0');
        } else {
            res.send('1');
        }
    });
});

module.exports = router;