const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

let cachedData = {
    gingerscope: "Loading...",
    lastUpdated: null
};

async function updateValues() {
    console.log('Launching browser to fetch Supreme Values (Ancients)...');
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true, // Можешь поставить false, чтобы проверить глазами
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Переходим сразу на страницу с анциентами, где точно есть Gingerscope
        await page.goto('https://supremevalues.com/mm2/ancients', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        // Ждем прогрузки элементов с ценами
        await page.waitForSelector('.itemvalue.val-top', { timeout: 15000 });
        
        // Нам нужно найти именно Gingerscope (так как на странице может быть несколько анциентов)
        const gingerscopePrice = await page.evaluate(() => {
            // Ищем все блоки с предметами
            const items = document.querySelectorAll('tr, .item-box, div'); // или пройдемся по структуре
            
            // Пробегаем по элементам и ищем тот, где название "Gingerscope"
            for (let el of document.querySelectorAll('div')) {
                if (el.textContent && el.textContent.includes('Gingerscope')) {
                    // Ищем внутри этого же блока цену с классом itemvalue val-top
                    const parent = el.closest('tr') || el.parentElement;
                    const priceEl = parent ? parent.querySelector('.itemvalue.val-top') : null;
                    if (priceEl) {
                        return priceEl.textContent.trim();
                    }
                }
            }
            
            // Запасной вариант, если структура проще: берем первый попавшийся, но лучше точный поиск выше
            const fallbackEl = document.querySelector('.itemvalue.val-top');
            return fallbackEl ? fallbackEl.textContent.trim() : null;
        });
        
        if (gingerscopePrice) {
            cachedData.gingerscope = gingerscopePrice;
            cachedData.lastUpdated = new Date().toISOString();
            console.log('Successfully parsed! Gingerscope value:', gingerscopePrice);
        } else {
            console.log('Gingerscope price element not found on page.');
        }
        
    } catch (error) {
        console.error('Error during puppeteer scraping:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

updateValues();
setInterval(updateValues, 5 * 60 * 1000);

app.get('/api/values', (req, res) => {
    res.json(cachedData);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});