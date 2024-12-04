function parseTime(timeString) {
  if (!timeString) return null;

  // Handle "5h 43m +" format
  if (timeString.includes("h") && timeString.includes("m")) {
    const parts = timeString.split(" ");
    const hours = parseInt(parts[0].replace("h", ""), 10);
    const minutes = parseInt(parts[1].replace("m", ""), 10);

    return { effectiveHours: hours, effectiveMinutes: minutes };
  }

  // Handle "4:31:51 PM" format
  const [time, modifier] = timeString.split(" ");
  let [hours, minutes, seconds] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  } else if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  return { lastHours: hours, lastMinutes: minutes };
}

function calculateTimeDifference(currentTime, lastTime) {
  const currentTimeParsed = parseTime(currentTime);
  const lastTimeParsed = parseTime(lastTime);

  let remainingHours =
    7 - currentTimeParsed.effectiveHours + lastTimeParsed.lastHours;
  let remainingMin =
    60 - currentTimeParsed.effectiveMinutes + lastTimeParsed.lastMinutes;

  if (remainingMin >= 60) {
    remainingHours++;
    remainingMin -= 60;
  }

  remainingHours = remainingHours > 12 ? remainingHours - 12 : remainingHours;
  remainingMin = remainingMin.toString().padStart(2, "0");

  return `${remainingHours}:${remainingMin}`;
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];

  if (tab) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: extractTimes,
      },
      async (results) => {
        // if (chrome.runtime.lastError) {
        //   const messageElement = document.querySelector(".message");
        //   messageElement.textContent = "Please First Load the PunchIn Time";
        //   return;
        // }

        const result = await results[0].result;
        const { currentTime, lastTime } = result;

        if (currentTime && lastTime) {
          const timeDifference = calculateTimeDifference(currentTime, lastTime);

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (timeDifference) => {
              const currentTimeElement = document.querySelector(
                ".d-flex .pie-percent + div span"
              );
              const currentTimeElementParent = currentTimeElement.parentNode;

              if (currentTimeElementParent) {
                currentTimeElementParent.style.display = "flex";
                currentTimeElementParent.style.alignItems = "center";
                currentTimeElementParent.style.textAlign = "center";
                currentTimeElementParent.style.gap = "20px";

                const existingDisplay =
                  currentTimeElementParent.querySelector(".time-display");
                if (existingDisplay) {
                  existingDisplay.textContent = `Time: ${timeDifference}`;
                } else {
                  const displayElement = document.createElement("div");
                  displayElement.classList.add("time-display");
                  displayElement.textContent = `Time: ${timeDifference}`;
                  displayElement.style.padding = "10px";
                  const themeMode = localStorage.getItem("ThemeMode");
                  displayElement.style.backgroundColor =
                    themeMode === "light" ? "#f5f5f5" : "#263042";
                  currentTimeElementParent.insertBefore(
                    displayElement,
                    currentTimeElement.nextSibling
                  );
                }
              }
            },
            args: [timeDifference],
          });
        } else {
          console.log("Keka Time Extention: No times found");
        }
      }
    );
  }
});

function extractTimes() {
  const currentTimeElement = document.querySelector(
    ".d-flex .pie-percent + div span"
  );
  const currentTime = currentTimeElement
    ? currentTimeElement.textContent.trim()
    : null;

  if (currentTimeElement) {
    currentTimeElement.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        const parentElement = document.querySelector(
          ".d-flex.mt-10:last-child"
        );
        const lastTimeElement = parentElement
          ? parentElement.querySelector(".ki-arrow-forward.ki-green + span")
          : null;
        const lastTime = lastTimeElement
          ? lastTimeElement.textContent.trim()
          : null;

        // console.log("Extracted Times:", { currentTime, lastTime });
        resolve({ currentTime, lastTime });
      }, 500);
    });
  }

  return { currentTime, lastTime: null };
}
