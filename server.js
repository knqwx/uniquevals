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
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        await page.goto('https://supremevalues.com/mm2/ancients', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        
        await page.waitForSelector('.itemvalue.val-top', { timeout: 15000 });
        
        const gingerscopePrice = await page.evaluate(() => {
            for (let el of document.querySelectorAll('div')) {
                if (el.textContent && el.textContent.includes('Gingerscope')) {
                    const parent = el.closest('tr') || el.parentElement;
                    const priceEl = parent ? parent.querySelector('.itemvalue.val-top') : null;
                    if (priceEl) {
                        return priceEl.textContent.trim();
                    }
                }
            }
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

// 1. Сначала парсим данные ПЕРЕД запуск сервера
(async () => {
    await updateValues();
    
    // 2. Только после первого успешного парсинга запускаем сервер
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})();

// Затем обновляем каждые 5 минут в фоне
setInterval(updateValues, 5 * 60 * 1000);

app.get('/api/values', (req, res) => {
    res.json(cachedData);
});
