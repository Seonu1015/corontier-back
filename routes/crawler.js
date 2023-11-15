const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
var db = require('../db');
const bodyParser = require('body-parser');

router.get('/', function(req, res, next) {
        console.log("실행됨?")
  });

async function scrape(query) {
 


    let browser;
    const results = [];
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        });

        const page = await browser.newPage();
        await page.goto('https://thinkyou.co.kr/contest/');

        // 검색어 입력
        await page.type('input[name="searchstr"]', query);

        // 검색 버튼 클릭
        await page.click('#searchStrBtn');

        // 5초 동안 기다리기
        await page.waitForTimeout(5000);

        // 검색 결과 로딩 대기
        await page.waitForSelector('.title');

        const content = await page.content();
        const $ = cheerio.load(content);

        // 검색 결과 항목 추출
        $('.title').each((index, element) => {
            const titleText = $(element).find('h3').text().trim();
            const hrefElement = $(element).find('a').attr('href');

            const dateRange = $(element).siblings('.etc').text().trim();
            const status = $(element).siblings('.statNew').find('p.icon').text().trim();
            const daysLeft = $(element).siblings('.statNew').text().replace(status, '').trim();

            if (titleText !== "" && hrefElement) {
                const href = hrefElement.trim();
                results.push({
                    index: index + 1,
                    title: titleText,
                    link: `https://thinkyou.co.kr${href}`,
                    date: dateRange,
                    status: status,
                    daysLeft: daysLeft,
                  
                });  
            }
        });
    } catch (error) {
        console.error('Scraping failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    const sql = 'SELECT * FROM contests';
    db.get().query(sql, async function(err, rows) {
        if (err) {
            console.error('데이터 조회 오류:', err);
            res.status(500).send('서버 오류');
        } else {
            for (let item of results) {
                const title = item.title;

                // 데이터베이스에서 해당 title이 이미 존재하는지 확인합니다.
                const exists = rows.some(row => row.title === title);
                //console.log("중복체크성공?")
                if (!exists) {
                    const link = item.link;
                    const period = item.date;
                    const con_status = item.status;
                    const remaining_term = item.daysLeft;

                    const sql2 = 'INSERT INTO contests (title, link, period, con_status, remaining_term) VALUES (?, ?, ?, ?, ?)';    
                    db.get().query(sql2, [title, link, period, con_status, remaining_term], function(err, insertResult) {
                        if (err) {
                            console.error('데이터 삽입 오류:', err);
                            // 삽입 오류시 추가적인 처리가 필요하면 여기에 추가합니다.
                        } else {
                            // 삽입에 성공했을 때의 추가적인 처리가 필요하면 여기에 추가합니다.
                            console.log("삽입성공?")
                            console.log(title)
                        }
                    });
                }
            }
            
        
        }


    })

    return results;
}

/*
async function minjiscrape(query) {
    let browser;
    const results = [];
    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        });

        const page = await browser.newPage();
        await page.goto('https://www.youtube.com/');

        // 검색어 입력
        await page.type('#search', query);

        // 검색 버튼 클릭 (YouTube의 검색 버튼 선택자)
        await page.click('#search-icon-legacy');

        // 검색 결과 로딩 대기
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // 결과 추출
        const videos = await page.evaluate(() => {
            const videoElements = document.querySelectorAll('ytd-video-renderer, ytd-grid-video-renderer');
            const videoList = [];
            videoElements.forEach((el, index) => {
                const titleElement = el.querySelector('#video-title');
                const additionalInfoElement = el.querySelector('.style-scope ytd-video-primary-info-renderer');
                const title = titleElement ? titleElement.innerText : null;
                const link = titleElement ? titleElement.href : null;
                const additionalInfo = additionalInfoElement ? additionalInfoElement.innerText.split('\n') : [];

                if (title && link) {
                    videoList.push({
                        index: index + 1,
                        title: title,
                        link: link,
                        additionalInfo: additionalInfo
                    });
                }
            });
            return videoList;
        });

        results.push(...videos);
    } catch (error) {
        console.error('Scraping failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    console.log(results);
    return results;
}

minjiscrape("자바")

















function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
async function crawleringchecker() {
    try {
        // 5초간 기다립니다
        await delay(5000);

        const sql = 'SELECT * FROM competionDaychecker ORDER BY updateid DESC';
        db.get().query(sql, function(err, rows) {
            if (err) {
                console.error(err);
                return;
            }
            if (rows.length > 0) {
                const updateday = rows[0].updateday;
              //  console.log(updateday);

                function getFormattedDate() {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = today.getMonth() + 1; // getMonth()는 0부터 시작합니다.
                    const day = today.getDate();
                
                    // 월과 일을 항상 두 자리 숫자로 표시합니다.
                    const formattedMonth = month < 10 ? `0${month}` : month;
                    const formattedDay = day < 10 ? `0${day}` : day;
                
                    return `${year}-${formattedMonth}-${formattedDay}`;
                }
                
                const currentDate = getFormattedDate();
             //   console.log(currentDate);
                if (updateday !== currentDate ){
                   // console.log("틀리다니깐?");
                    scrape("해커톤");
                    const updatedaysql = currentDate;
                    const sql2 = 'INSERT INTO competionDaychecker(updateday) values (?)';
                    db.get().query(sql2,[updatedaysql], function(err, rows) {
                        if(err){
                            console.log("업데이트실패");
                        }else{
                            console.log("업데이트성공");
                            console.log(updatedaysql);
                        }

                    });
                }else{
                    console.log("크롤링완료");
                    console.log(updateday);

                }

            } else {
                console.log("No data found");
            }

        });
    } catch (err) {
        console.error('Error occurred:', err);
    }
}

crawleringchecker();

*/








router.get('/list.json', async(req, res) => {
  
    const sql = 'SELECT * FROM contests';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});


router.get('/javalist.json', async(req, res) => {
  
    const sql = 'SELECT * FROM javayoutubedata';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});

router.get('/javalist/:vod_id', async(req, res) => { 
    const vod_id=req.params.vod_id;
    const sql = 'select * from javayoutubedata where vod_id=?';
    db.get().query(sql,[vod_id], async function(err, rows) {
        if (err) {
            console.log(err);
            res.status(500).send('Server Error');
            return;
          }
          res.send(rows[0]);
        });      
});


router.get('/javascriptlist.json', async(req, res) => {
  
    const sql = 'SELECT * FROM javascriptyoutubedata';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});




router.get('/phytonyoutubedatalist.json', async(req, res) => {
  
    const sql = 'SELECT * FROM phytonyoutubedata';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});



router.get('/reactyoutubedatalist.json', async(req, res) => {
  
    const sql = 'SELECT * FROM reactyoutubedata';

    db.get().query(sql, async function(err, rows) {
      
            res.send({ list: rows });
        })
    
});





module.exports = router;