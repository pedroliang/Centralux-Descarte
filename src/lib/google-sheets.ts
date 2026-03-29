const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1fRqUo8vH4awjCwV12U0fhR2bdBSRGFUVMlU8PozUsoQ/gviz/tq?tqx=out:csv&sheet=Estoque%201'

export async function fetchProductDescription(code: string): Promise<string | null> {
  if (!code) return null

  try {
    const response = await fetch(SHEET_CSV_URL)
    const text = await response.text()
    
    // Simple CSV parser for this specific use case
    // We expect Column A to be the code, and Column B to be the description
    const lines = text.split('\n')
    
    for (const line of lines) {
      // Handle quoted CSV values by removing quotes and splitting by regex
      const row = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
      const columns = row.map(col => col.replace(/^"(.*)"$/, '$1'))
      
      if (columns.length >= 2) {
        const rowCode = columns[0].trim()
        if (rowCode === code.trim()) {
          return columns[1].trim()
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error)
    return null
  }
}
