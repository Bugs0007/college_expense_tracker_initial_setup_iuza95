"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import Papa from "papaparse";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const processCsvFile = action({
  args: {
    csvContent: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Starting CSV processing action...");

    // Get the user ID from the 'users' table via an internal query
    const userId = await ctx.runQuery(internal.users.getAuthenticatedUserId);

    if (!userId) {
      console.error("User not authenticated or ID could not be retrieved by internal query.");
      throw new Error("User not authenticated. Cannot process CSV file.");
    }
    console.log("Authenticated User ID for DB:", userId);

    try {
      // console.log("CSV Content (first 500 chars):", args.csvContent.substring(0, 500));
      const parseResult = Papa.parse(args.csvContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, 
        transformHeader: header => header.trim(), 
      });

      // console.log("Detected CSV Headers:", JSON.stringify(parseResult.meta.fields));

      if (parseResult.errors.length > 0) {
        const criticalErrors = parseResult.errors.filter(e => e.code !== 'TooFewFields' && e.code !== 'TooManyFields' && e.code !== 'UndetectableDelimiter');
        if (criticalErrors.length > 0) {
            console.error("Critical CSV Parsing errors:", JSON.stringify(criticalErrors));
            throw new Error(
              `Error parsing CSV: ${criticalErrors.map((e) => `Row ${e.row}: ${e.message} (${e.code})`).join("; ")}`
            );
        }
      }
      
      if (!parseResult.data || parseResult.data.length === 0) {
        console.log("No data rows found in the CSV file after parsing by PapaParse.");
        if (parseResult.meta && parseResult.meta.aborted === false && parseResult.meta.truncated === false && parseResult.data.length === 0) {
             return "CSV file processed by parser, but it appears to be empty or contains no data rows.";
        }
        return "No data rows found in the CSV file, or file could not be parsed correctly by PapaParse.";
      }
      
      // console.log(`Found ${parseResult.data.length} rows in CSV by PapaParse.`);

      const expensesData: Array<{
        name: string;
        amount: number;
        category: string;
        date: string;
        isPurchased: boolean;
        eventId?: Id<"events">;
      }> = [];
      
      let rowsProcessedCount = 0;

      for (const row of parseResult.data as any[]) {
        rowsProcessedCount++;
        let skipReason = "";
        
        if (!row || Object.keys(row).length === 0) {
            // if(rowsProcessedCount <= 5) console.log(`Row ${rowsProcessedCount}: Skipping empty or undefined row object.`);
            continue;
        }
        
        const rowKeys = Object.keys(row);
        if (rowKeys.length === 1 && (row[rowKeys[0]] === null || row[rowKeys[0]] === "")) {
            // if(rowsProcessedCount <= 5) console.log(`Row ${rowsProcessedCount}: Skipping row that likely resulted from an empty line in CSV: ${JSON.stringify(row)}`);
            continue;
        }
        
        // if(rowsProcessedCount <= 5) { 
        //     console.log(`Row ${rowsProcessedCount} (raw from PapaParse): ${JSON.stringify(row)}`);
        // }

        const name = typeof row.name === 'string' ? row.name.trim() : row.name;
        const category = typeof row.category === 'string' ? row.category.trim() : row.category;

        if (!name) skipReason += "Field 'name' is missing, empty, or not a string. ";
        
        let currentAmount = row.amount;
        if (typeof currentAmount !== "number" || isNaN(currentAmount)) {
            if (typeof currentAmount === 'string') {
                const cleanedAmountString = currentAmount.replace(/[^0-9.-]+/g,"");
                const parsedAmount = parseFloat(cleanedAmountString);
                if (!isNaN(parsedAmount)) {
                    currentAmount = parsedAmount;
                } else {
                    skipReason += `Field 'amount' ('${row.amount}') could not be parsed into a number. Cleaned: '${cleanedAmountString}'. `;
                }
            } else {
                skipReason += `Field 'amount' ('${row.amount}') is not a number or a parsable string. Type: ${typeof currentAmount}. `;
            }
        }
        if (!category) skipReason += "Field 'category' is missing, empty, or not a string. ";
        
        if (!row.date) {
            skipReason += "Field 'date' is missing. ";
        }
        
        let isPurchased = row.isPurchased;
        if (typeof isPurchased === 'string') {
            const lowerIsPurchased = isPurchased.toLowerCase();
            if (lowerIsPurchased === 'true') isPurchased = true;
            else if (lowerIsPurchased === 'false') isPurchased = false;
            else skipReason += `Field 'isPurchased' ('${row.isPurchased}') is a string but not 'true' or 'false'. `;
        } else if (typeof isPurchased !== "boolean") {
            skipReason += `Field 'isPurchased' ('${row.isPurchased}') is not a boolean or a parsable string. Type: ${typeof isPurchased}. `;
        }

        let formattedDate = "";
        if (row.date) { 
          try {
            const parsedDate = new Date(row.date);
            if (isNaN(parsedDate.getTime())) {
              throw new Error("Date string resulted in an invalid Date object.");
            }
            formattedDate = parsedDate.toISOString();
          } catch (e: any) {
            skipReason += `Field 'date' ('${row.date}') could not be parsed into a valid date: ${e.message}. `;
          }
        }
        
        if (skipReason) {
          console.warn(`Row ${rowsProcessedCount}: Skipped. Reasons: ${skipReason} | Original Row Data: ${JSON.stringify(row)}`);
          continue;
        }

        expensesData.push({
          name: String(name),
          amount: Number(currentAmount),
          category: String(category),
          date: formattedDate,
          isPurchased: Boolean(isPurchased),
        });
        // if(rowsProcessedCount <= 5) {
        //     console.log(`Row ${rowsProcessedCount}: Successfully validated and prepared for batch insert: ${JSON.stringify(expensesData[expensesData.length-1])}`);
        // }
      }

      if (expensesData.length === 0) {
        console.log("No valid expenses found after detailed row-by-row validation.");
        return "No valid expenses found in the CSV file after validation. Please check the Convex function logs for 'fileActions:processCsvFile' for detailed parsing and validation messages for each row. Common issues include incorrect column names (expected: name, amount, category, date, isPurchased), or data types not matching (e.g., amount should be numeric, isPurchased should be true/false, date should be a recognizable date format).";
      }

      const chunkSize = 500; 
      for (let i = 0; i < expensesData.length; i += chunkSize) {
        const chunk = expensesData.slice(i, i + chunkSize);
        await ctx.runMutation(internal.expenses.batchAddExpenses, {
          expenses: chunk,
          userId: userId, 
        });
      }
      console.log(`Successfully processed and added ${expensesData.length} expenses to the database.`);
      return `Successfully processed and added ${expensesData.length} expenses from the CSV.`;
    } catch (error) {
      console.error("Critical error during CSV file processing in action:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.name === "ArgumentValidationError") {
          throw error; 
      }
      throw new Error("Failed to process CSV file due to a critical error: " + errorMessage);
    }
  },
});
