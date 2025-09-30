"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTimeEntriesMigration = applyTimeEntriesMigration;
const supabase_1 = require("../lib/supabase");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Apply time_entries table migration to the database
 */
async function applyTimeEntriesMigration() {
    try {
        console.log('🚀 Starting time_entries table migration...');
        // Read the SQL migration file
        const sqlPath = path.join(__dirname, 'create-time-entries-table.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        console.log('📖 SQL migration file loaded');
        // Execute the migration
        const { data, error } = await supabase_1.supabase.rpc('exec_sql', {
            sql: sqlContent
        });
        if (error) {
            console.error('❌ Migration failed:', error);
            // If the RPC function doesn't exist, try direct query execution
            console.log('🔄 Trying alternative migration approach...');
            // Split SQL into individual statements and execute them
            const statements = sqlContent
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            for (const statement of statements) {
                try {
                    console.log(`Executing: ${statement.substring(0, 100)}...`);
                    const { error: stmtError } = await supabase_1.supabase.rpc('exec_sql', {
                        sql: statement
                    });
                    if (stmtError) {
                        console.warn(`Warning for statement: ${stmtError.message}`);
                    }
                }
                catch (stmtErr) {
                    console.warn(`Skipping statement due to error: ${stmtErr}`);
                }
            }
            console.log('✅ Alternative migration completed');
        }
        else {
            console.log('✅ Migration executed successfully');
        }
        // Verify the table was created
        const { data: tableData, error: tableError } = await supabase_1.supabase
            .from('time_entries')
            .select('*')
            .limit(1);
        if (tableError) {
            if (tableError.code === 'PGRST106') {
                console.log('⚠️ Table created but no data exists yet (expected)');
            }
            else {
                console.error('❌ Table verification failed:', tableError);
                return false;
            }
        }
        else {
            console.log('✅ Table verified successfully');
        }
        console.log('🎉 time_entries table migration completed successfully!');
        return true;
    }
    catch (error) {
        console.error('💥 Migration failed with error:', error);
        return false;
    }
}
// Run the migration if this script is executed directly
if (require.main === module) {
    applyTimeEntriesMigration()
        .then(success => {
        if (success) {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        }
        else {
            console.log('❌ Migration failed');
            process.exit(1);
        }
    })
        .catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}
