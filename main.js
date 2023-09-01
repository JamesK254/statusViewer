const puppeteer = require("puppeteer-extra");
const readline = require("readline");
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const click = async function click(page, xpath) {
  try {
    const element = await page.waitForXPath(xpath, { timeout: 300000 });
    if (element) {
      const dim = await element.boundingBox();
      const x = dim.x + dim.width / 2;
      const y = dim.y + dim.height / 2;
      await page.mouse.move(x, y);
      // element.evaluate(c => c.scrollIntoView());
      await page.mouse.click(x, y, { button: "left" });
      console.log(`This Bot has clicked an element \n`);
    } else {
      console.log("This Bot didnt find am Xpath for the Element");
    }
  } catch (e) {
    console.log(e.message);
  }
};

async function getTextFromXpath(page, xpath) {
  // Wait for the element to appear on the page
  await page.waitForXPath(xpath, { timeout: 300000 });

  // Get the text from the element using evaluate
  const text = await page.evaluate(() => {
    const xpath =
      "//*[@id='app']/div/span[3]/div/span/div/div/span/div/div/div/div/div[2]/div[2]/div[1]/span";
    const element = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;
    return element ? element.innerText : null;
  });

  return text;
}

// Function to sleep for 1 second (1000 milliseconds)
function sleep(seconds) {
  return new Promise((resolve) => setTimeout(resolve, 1000 * seconds));
}

// Create an interface to read user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to prompt the user for input
function promptUser() {
  return new Promise((resolve, reject) => {
    rl.question("Please enter session ID: ", (input) => {
      resolve(input);
    });
  });
}

async function subRun(page) {
  // Wait for the parent div with class "statusList" to appear on the page
  await page.waitForSelector(".statusList", { timeout: 300000 });

  // Get the titles and inner text paired together within [role="listitem"] div
  const data = await page.$$eval(
    '.statusList [role="listitem"]',
    (elements) => {
      return elements.map((element) => {
        const titleElement = element.querySelector("span[title]");
        const title = titleElement ? titleElement.getAttribute("title") : null;

        const innerTextElement = element.querySelector(
          '[data-testid="cell-frame-secondary"] div'
          
        );
        const innerText = innerTextElement
          ? innerTextElement.innerText.trim()
          : null;
        
        
        return title;
        // return [title, innerText];
      });
    }
  );
  // console.log('Eval passed', data);

  // Filter out any null or undefined values in the data array
  const filteredData = data.filter((title) => title);
  return filteredData;
}

async function run() {
  try {
    const userInput = await promptUser();
    const CDP_ENDPOINT = `ws://127.0.0.1:9222/devtools/browser/${userInput}`;
    // Connect to an existing Chrome browser using CDP
    const browser = await puppeteer.connect({
      browserWSEndpoint: CDP_ENDPOINT,
    });

    // Get all open pages
    const pages = await browser.pages();

    // Use the first page (tab) from the array of pages
    const page = pages[0];

    // Now you can interact with the existing page
    // Get the page title and print it
    const pageTitle = await page.title();
    console.log("Page title:", pageTitle);
    // global variable
    let isViewing = false;
    let foundUser = false;
    await click(
      page,
      '//*[@id="app"]/div/div/div[4]/header/div[2]/div/span/div[2]/div/span'
    );

    while (true) {
      console.log('Running')
      // You can continue interacting with the page as needed
      let formattedData;
      let targetUser = "Francyn";
      

      while (!foundUser) {
        // You can continue interacting with the page as needed
        formattedData = await subRun(page);
        formattedData.forEach(username => {
          if(username == targetUser){
            console.log(`The user:${targetUser} found!`);
            foundUser = true;
          }
        });


        if (!foundUser) {
          // console.log("User not found. Reloading in the next 10 seconds...");
          console.log(`User not found ${targetUser}`);
          await sleep(2);
          // await page.reload();
        }
      }

      console.log("User found");
      // Find the element with the value 'Daisy' and click it
      const userElement = await page.$(
        `.statusList [role="listitem"] span[title="${targetUser}"]`
      );
      if (userElement) {
        await sleep(2);
        await userElement.click();
        isViewing = true;
        console.log(`Clicked on the element with title ${targetUser}.`);
      }

      while (isViewing) {
        let currentUser = await getTextFromXpath(
          page,
          "//*[@id='app']/div/span[3]/div/span/div/div/span/div/div/div/div/div[2]/div[2]/div[1]/span"
        );
        console.log(`The current user is ${currentUser}`);
        if (currentUser !== targetUser) {
          await click(
            page,
            '//*[@id="app"]/div/span[3]/div/span/div/div/button[2]/span'
          );
          console.log(
            `Completed viewing ${targetUser} status succefully, now waiting for new post`
          );
          isViewing = false;
          foundUser = false;
        }
        await sleep(1);
      }
    }
  } catch (err) {
    console.error("Error occurred:", err);
  }
}

// Call the async function
run();
