const puppeteer = require('puppeteer-extra')
const readline = require('readline');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())


const click = async function click(page, xpath) {
    try {
        const element = await page.waitForXPath(xpath, {timeout: 300000})
        if (element) {
            const dim = await element.boundingBox()
            const x = dim.x + (dim.width / 2);
            const y = dim.y + (dim.height / 2);
            await page.mouse.move(x, y)
            // element.evaluate(c => c.scrollIntoView());
            await page.mouse.click(x, y, { button: "left" })
            console.log(`This Bot has clicked an element \n`)
        } else { console.log("This Bot didnt find am Xpath for the Element") }
    } catch (e) { console.log(e.message) }
}

async function getTextFromXpath(page,xpath){
    // Wait for the element to appear on the page
    await page.waitForXPath(xpath, {timeout: 300000});

    // Get the text from the element using evaluate
    const text = await page.evaluate(() => {
      const xpath = "//*[@id='app']/div/span[3]/div/span/div/div/span/div/div/div/div/div[2]/div[2]/div[1]/span";
      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      return element ? element.innerText : null;
    });

    return text;
}

// Function to sleep for 1 second (1000 milliseconds)
function sleep(seconds) {
    return new Promise((resolve) => setTimeout(resolve, (1000 * seconds)));
  }

  

// Create an interface to read user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt the user for input
function promptUser() {
  return new Promise((resolve, reject) => {
    rl.question('Please enter session ID: ', (input) => {
      resolve(input);
    });
  });
}


async function subRun(page){
        
        await click(page, '//*[@id="app"]/div/div/div[4]/header/div[2]/div/span/div[2]/div/span')
        // Wait for the parent div with class "statusList" to appear on the page
        await page.waitForSelector('.statusList', {timeout: 300000});

        // Get the titles and inner text paired together within [role="listitem"] div
        const data = await page.$$eval('.statusList [role="listitem"]', elements => {
            return elements.map(element => {
            const titleElement = element.querySelector('span[title]');
            const title = titleElement ? titleElement.getAttribute('title') : null;
    
            const innerTextElement = element.querySelector('[data-testid="cell-frame-secondary"] div');
            const innerText = innerTextElement ? innerTextElement.innerText.trim() : null;
    
            return [title, innerText];
            });
        });
    
        // Filter out any null or undefined values in the data array
        const filteredData = data.filter(([title, innerText]) => title && innerText);

        // Convert time strings into formatted datetime strings
        const formattedData = filteredData.map(([title, timeString]) => {
        const now = new Date();
        const timeParts = timeString.match(/(\d+):(\d+)\s+(am|pm)/i);

        if (!timeParts) return [title, 'Invalid Time'];

        let hour = parseInt(timeParts[1]);
        const minute = parseInt(timeParts[2]);
        const ampm = timeParts[3].toLowerCase();
        if (ampm === 'pm' && hour < 12) hour += 12;

        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
        if (timeString.toLowerCase().includes('yesterday')) {
            date.setDate(now.getDate() - 1);
        }

        let newformattedDate = date.setHours(date.getHours() + 3); //adding 3 hours for my local time

        return [title, newformattedDate];
        });

        return formattedData;
}

async function run() {
    try {
        const userInput = await promptUser();
        const CDP_ENDPOINT = `ws://127.0.0.1:9222/devtools/browser/${userInput}`;
        // Connect to an existing Chrome browser using CDP
        const browser = await puppeteer.connect({ browserWSEndpoint: CDP_ENDPOINT });

        // Get all open pages
        const pages = await browser.pages();

        // Use the first page (tab) from the array of pages
        const page = pages[0];

        // Now you can interact with the existing page
        // Get the page title and print it
        const pageTitle = await page.title();
        console.log('Page title:', pageTitle);

        while(true){
            // You can continue interacting with the page as needed
        let formattedData;
        let targetUser = 'Solo';
        let foundUser = false;

        while (!foundUser) {
            // You can continue interacting with the page as needed
            formattedData = await subRun(page);
      
            for (const [username, timestamp] of formattedData) {
              if (username === targetUser) {
                console.log(`${targetUser} found! Timestamp: ${timestamp}`);
                foundUser = true;
                break; // No need to continue checking if the user is found
              }
            }
      
            if (!foundUser) {
              console.log("User not found. Reloading in the next 10 seconds...");
              await sleep(10);
              await page.reload();
            }
          }
      
          console.log("User found");
          // Find the element with the value 'Daisy' and click it
          const userElement = await page.$(`.statusList [role="listitem"] span[title="${targetUser}"]`);
          if (userElement) {
            await sleep(3);
            await userElement.click();
            console.log(`Clicked on the element with title ${targetUser}.`);
          }
      
          while (true) {
            let currentUser = await getTextFromXpath(page, "//*[@id='app']/div/span[3]/div/span/div/div/span/div/div/div/div/div[2]/div[2]/div[1]/span");
            console.log(`The current user is ${currentUser}`);
            if (currentUser !== targetUser) {
              await click(page, '//*[@id="app"]/div/span[3]/div/span/div/div/button[1]/span');
              console.log(`Completed viewing ${targetUser} status succefully, now reloading after 5 seconds`);
              await sleep(5);
              await page.reload();
              break;
            }
            await sleep(1);
          }
        }
            } catch (err) {
                console.error('Error occurred:', err);
        }
}

// Call the async function
run();
