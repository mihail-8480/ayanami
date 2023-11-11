import { loop, splitWork } from "./lib";

let globalCounter = 0;
let counterIndex = 0;

splitWork({
  ...loop(
    async () => {
      const currentCounter = counterIndex++;
      return async (index: number) => {
        globalCounter++;
        console.log(
          `[${currentCounter}] count: ${globalCounter}, index: ${index}`
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
      };
    },
    () => globalCounter === 100
  ),
  async: {
    amount: 10,
    workers: 10,
  },
}).then(() => {
  console.log(
    `Split work finished with ${counterIndex} counters created and counter value ${globalCounter}`
  );
});
