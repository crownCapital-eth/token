import { useState } from "react";

export default function useLocalStorage(key, initialValue, ttl) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      const parsedItem = item ? JSON.parse(item) : initialValue;

      if (typeof parsedItem === "object" && parsedItem !== null && "expiry" in parsedItem && "value" in parsedItem) {
        const now = new Date();
        if (ttl && now.getTime() > parsedItem.expiry) {
          window.localStorage.removeItem(key);
          return initialValue;
        }
        return parsedItem.value;
      }
      return parsedItem;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = value => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (ttl) {
        const now = new Date();
        const item = {
          value: valueToStore,
          expiry: now.getTime() + ttl,
        };
        window.localStorage.setItem(key, JSON.stringify(item));
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
