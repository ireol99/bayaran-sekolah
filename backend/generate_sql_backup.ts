import { db } from './src/config/database';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function generateSqlBackup() {
  try {
    console.log('Fetching tables...');
    const tablesRes = await db.execute(sql.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `));
    
    const tables = tablesRes as any[];
    let sqlDump = '-- PostgreSQL Database Backup\n';
    sqlDump += `-- Generated at: ${new Date().toISOString()}\n\n`;
    
    for (const t of tables) {
      const tableName = t.table_name;
      console.log(`Processing table: ${tableName}`);
      const dataRes = await db.execute(sql.raw(`SELECT * FROM "${tableName}";`)) as any[];
      
      if (dataRes.length === 0) {
        continue;
      }
      
      sqlDump += `-- Data for table: ${tableName}\n`;
      
      for (const row of dataRes) {
        const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
        const values = Object.values(row).map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'number' || typeof val === 'boolean') return val;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          // String escape
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');
        
        sqlDump += `INSERT INTO "${tableName}" (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
      }
      sqlDump += '\n';
    }
    
    const fileName = `../database_backup.sql`;
    fs.writeFileSync(fileName, sqlDump);
    console.log(`✅ Backup SQL berhasil disimpan ke file: ${fileName}`);
    process.exit(0);
  } catch (err) {
    console.error('Backup error:', err);
    process.exit(1);
  }
}
generateSqlBackup();
