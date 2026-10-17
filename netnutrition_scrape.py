'''
Each restaurant's tab can be found as a.text-white within section #cbo_nn_unitDataList
After navigating to a restaurant, the menu may be split. In this case, there are more links in section.card.mb-3.h4 as a.cbo_nn_menuLink
Inside the tbody, click the div[role="button"]. Then, inside r.cbo_nn_itemPrimaryRow or tr.cbo_nn_itemPrimaryAlternateRow, click the a.cbo_nn_itemHover to view nutrition information.
Inside div #nutritionLabel, find all div.cbo_nn_LabelBorderedSubHeader for nutrition information, name under td.cbo_nn_LabelHeader
Handle serving size, calories separately under div.bold-text.inline-div-right in div.cbo_nn_LabelBottomBorderLabel, td.cbo_nn_LabelSubHeader
To go back to the restaurant's menus, click a.cbo_nn_navBarUnitDiv
'''

import selenium
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import StaleElementReferenceException
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import ElementNotInteractableException
import time
import json

driver = webdriver.Chrome()

field_names = {
    "Total Fat": "total_fat_g",
    "Saturated Fat": "saturated_fat_g",
    "Trans Fat": "trans_fat_g",
    "Cholesterol": "cholesterol_mg",
    "Sodium": "sodium_mg",
    "Total Carbohydrate": "carbs_g",
    "Dietary Fiber": "fiber_g",
    "Total Sugars": "sugars_g",
    "Protein": "protein_g",
}

missing = []

#To be used for any failed accesses
#Takes an index i of the potentially stale element, uses open_item to retrieve a fresh element
def retry_stale(action, i, selector, restaurant, retries=3, retry_delay=1.5, **kwargs):
    """Run action(); if the DOM changes underneath it, wait and run it again."""
    for attempt in range(retries):
        try:
            return action(open_item(i, selector), restaurant, **kwargs)
        except (StaleElementReferenceException, TimeoutException, ValueError):
            if attempt == retries - 1:
                raise  # out of retries, let it propagate
            time.sleep(retry_delay)

#Refreshes the item
def open_item(i, selector, delay=0.7):
    links = WebDriverWait(driver, 10).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
    ) # fresh lookup
    return links[i]

#Navigates to each restaurant and handles different menus, if needed
def process_restaurant(link, delay=0.6):
    restaurant = link.text
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", link)
    link.click()
    time.sleep(delay)
    
    items = []

    #If restaurant is split into multiple menus, go to each menu
    try:
        menus = driver.find_element(By.CSS_SELECTOR, "section.card.mb-3.h4")
    except NoSuchElementException:
        menus = None

    if menus:
        count = len(WebDriverWait(driver, 5).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "section.card.mb-3.h4 a.cbo_nn_menuLink"))
        ))

        for i in range(count):
            time.sleep(delay)
            links = WebDriverWait(driver, 5).until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "section.card.mb-3.h4 a.cbo_nn_menuLink"))
            )
            #time.sleep(3)

            items.extend(process_menu(restaurant, links[i]))
    else:
        items = process_menu(restaurant)
    
    return items

#Opens all dropdown menus to access items
#Navigates to and returns from a menu, if needed
#Passes restaurant name to process_item
#Returns a list of item dictionaries
def process_menu(restaurant, link="", delay=0.6):
    if link:
        #time.sleep(3)
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", link)
        link.click()
        time.sleep(delay)

    menu = []

    #Use find elements in case some pages do not have the dropdown menu
    categories = driver.find_elements(By.CSS_SELECTOR, 'tbody tr[aria-expanded="false"] div[role="button"]')
    
    #Open all dropdown menus (that are not open already)
    for _ in range(50):
        if not categories:
            break
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", categories[0])
        categories[0].click()
        time.sleep(0.3)
        categories = driver.find_elements(By.CSS_SELECTOR, 'tbody tr[aria-expanded="false"] div[role="button"]')

    time.sleep(delay)
    count = len(WebDriverWait(driver, 5).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "tbody a.cbo_nn_itemHover"))
    ))
    
    for i in range(count):
        item_links = WebDriverWait(driver, 5).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "tbody a.cbo_nn_itemHover"))
        )

        try:
            result = process_item(item_links[i], restaurant)

            if result is not None:
                menu.append(result)
        except (StaleElementReferenceException, TimeoutException, ValueError):
            try:
                print(f"Retrying {item_links[i].text} ({restaurant})")
                menu.append(retry_stale(process_item, i, "tbody a.cbo_nn_itemHover", restaurant, delay=1.5))
            except (StaleElementReferenceException, TimeoutException, ValueError):
                print(f"Retry failed; giving up on {item_links[i].text} ({restaurant}) and adding to missing list")
                missing.append({"restaurant": restaurant, "item": item_links[i].text})

    if link:
        back = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "a.cbo_nn_navBarUnitDiv"))
        )

        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", back)
        
        back.click()
        time.sleep(delay)

    return menu

#Opens item's nutrition menu and processes nutrition table
#Takes restaurant name to be included in item
#Returns a dictionary representing one menu item
def process_item(link, restaurant, delay=0.7):
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'})", link)
    link_text = link.text #Used in error handler to prevent stale element exception when accessing text from link
    flag = False
    try:
        link.click()
    except ElementNotInteractableException:
        print(f"Encountered error for {link_text} ({restaurant}); could not click link")
        flag = True
    time.sleep(delay)
    
    item = {"restaurant": restaurant}

    name = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#nutritionLabel td.cbo_nn_LabelHeader"))
    ).text

    #Can wait for a shorter time if the first one has already loaded
    serving_text = WebDriverWait(driver, 3).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#nutritionLabel div.cbo_nn_LabelBottomBorderLabel div.bold-text.inline-div-right"))
    ).text
    serving_size = float(serving_text.split("(")[-1].split("g")[0])  # Retrieve serving size, g from text

    calories = float(WebDriverWait(driver, 3).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "#nutritionLabel td.cbo_nn_LabelSubHeader div.bold-text.inline-div-right"))
    ).text)

    nutrition_divs = WebDriverWait(driver, 3).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "#nutritionLabel div.cbo_nn_LabelBorderedSubHeader"))
    ) #All listed nutrients other than calories, serving size

    count = len(nutrition_divs)

    item["name"] = name
    item["serving_size_g"] = serving_size
    item["kcal"] = calories

    for i in range(count):
        nutrition_divs = WebDriverWait(driver, 5).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "#nutritionLabel div.cbo_nn_LabelBorderedSubHeader"))
        )

        div = nutrition_divs[i]

        spans = div.find_elements(By.CSS_SELECTOR, "span")

        if len(spans) == 2:
            nutrient = spans[0].text.strip()
            amount = spans[1].text.strip()

            if nutrient in field_names:
                item[field_names[nutrient]] = (
                    None if amount == "NA"
                    else float(amount.removeprefix("<").removesuffix("mg").removesuffix("g").strip())
                )

    if(flag):
        print("Item not clicked: " + str(item))

    return item

try:
    driver.get("https://netnutrition.cbord.com/nn-prod/Duke")

    disclaimer_button = driver.find_element(By.CSS_SELECTOR, ".modal.show").find_element(By.CSS_SELECTOR, "button.btn")
    disclaimer_button.click()

    section = driver.find_element(By.ID, "cbo_nn_unitDataList") #Get section containing nav links for all restaurants
    count = len(section.find_elements(By.CSS_SELECTOR, "a.text-white")) #Exclude non-nav links in the section

    items = []
    restaurants = []
    for i in range(count):
        section = driver.find_element(By.ID, "cbo_nn_unitDataList")
        links = section.find_elements(By.CSS_SELECTOR, "a.text-white")
        items.extend(process_restaurant(links[i]))
        restaurants.append({"name": links[i].text})

        #Early exit for testing
        '''
        if(len(restaurants) >= 1):
            break
        '''

    #print(restaurants)
    #print(items)
    print(missing)
finally:
    with open("duke_nutrition.json", "w", encoding="utf-8") as f:
        json.dump({"restaurants": restaurants, "items": items, "missing": missing}, f, indent=2, ensure_ascii=False)
    driver.quit()