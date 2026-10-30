const ATTEMPT_LIMIT     = 1000;
const CABLE_LIMIT       = 15;
const CAPACITIES        = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5];
const COLUMNS           = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
const DEFAULT_SEED      = '051002';
const GRID_SIZE         = 20;
const ORTHOGONAL_DIRS   = [[0, 1], [0, -1], [1, 0], [-1, 0]];

const TRANSLATIONS = {
    EN: {
        gameTitle           : "Towers",
        btnClear            : "Clear",
        btnFinish           : "Finish",
        toolSmall           : "Small Cable",
        toolLarge           : "Large Cable",
        toolTowerCable      : "Tower Cable",
        toolExtraTower      : "Extra Tower",
        labelScore          : "Score",
        labelBuildCostTime  : "Build Cost/Time",
        labelDrawTime       : "Draw Time",
        labelCapacityServed : "Served Capacity",
        labelRiverCrossings : "River Crossings",
        rulesTitle          : "Rules",
        rule1               : 'Connect all Capacity tiles to a <span class="text-[#fa3232] dark:text-[#fa9696]">Tower</span> within 15 cable lengths and minimize build cost/time',
        rule2               : 'Lay <b class="text-slate-900 dark:text-white">Small/Large Cables</b> from <b class="text-[#fa3232] dark:text-[#fa9696]">Towers</b> to <b class="text-slate-900 dark:text-white">Capacity</b> tiles, or place <b class="text-[#fa3232] dark:text-[#fa9696]">Extra Towers</b> and connect them using <b class="text-[#fa3232] dark:text-[#fa9696]">Tower Cables</b>',
        rule3               : 'You can\'t build on <b class="text-[#329632] dark:text-[#96fa96]">Mountain</b> tiles',
        rule4               : 'Laying cables on <b class="text-[#323296] dark:text-[#9696fa]">River</b> tiles costs 40/30 per cable-tile',
        rule5               : 'Click <span class="inline-flex items-center gap-1 bg-[#329632] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm"> <i class="fa-solid fa-circle-check"></i> Finish</span> after all <b class="text-slate-900 dark:text-white">Capacity</b> tiles are fully served to lock your score (Cost &times; Build Time + Draw Time)',
        btnDownloadMap      : "Download",
        btnKeepPlaying      : "Close",
        btnNextSeed         : "Next",
        shareSeed           : "Seed",
        shareScore          : "Score",
        shareBuildCost      : "Build Cost",
        shareBuildTime      : "Build Time",
        shareDrawTime       : "Draw Time"
    },

    JP: {
        gameTitle           : "タワーズ",
        btnClear            : "クリア",
        btnFinish           : "完了",
        toolSmall           : "小ケーブル",
        toolLarge           : "大ケーブル",
        toolTowerCable      : "タワーケーブル",
        toolExtraTower      : "追加タワー",
        labelScore          : "スコア",
        labelBuildCostTime  : "建設コスト・時間",
        labelDrawTime       : "描画時間",
        labelCapacityServed : "供給済み容量",
        labelRiverCrossings : "渡河",
        rulesTitle          : "ルール",
        rule1               : '全ての容量タイルを<span class="text-[#fa3232] dark:text-[#fa9696]">タワー</span>から15ケーブル長以内に接続し、建設コスト・時間を最小化せよ',
        rule2               : '<b class="text-[#fa3232] dark:text-[#fa9696]">タワー</b>から<b class="text-slate-900 dark:text-white">容量</b>タイルへ<b class="text-slate-900 dark:text-white">小・大ケーブル</b>を敷設するか、<b class="text-[#fa3232] dark:text-[#fa9696]">追加タワー</b>を設置して<b class="text-[#fa3232] dark:text-[#fa9696]">タワーケーブル</b>で接続せよ',
        rule3               : '<b class="text-[#329632] dark:text-[#96fa96]">山岳</b>タイルには建設できない',
        rule4               : '<b class="text-[#323296] dark:text-[#9696fa]">河川</b>タイル上にケーブルを敷設すると、1タイルあたり40/30のコスト・時間がかかる',
        rule5               : '全てのの<b class="text-slate-900 dark:text-white">容量</b>タイルが完全に供給された後、<span class="inline-flex items-center gap-1 bg-[#329632] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm"><i class="fa-solid fa-circle-check"></i> 完了</span> をクリックしてスコアを確定せよ（コスト &times; 建設時間 + 描画時間）',
        btnDownloadMap      : "ダウンロード",
        btnKeepPlaying      : "閉じる",
        btnNextSeed         : "続ける",
        shareSeed           : "シード",
        shareScore          : "スコア",
        shareBuildCost      : "建設コスト",
        shareBuildTime      : "建設時間",
        shareDrawTime       : "描画時間"
    },

    ID: {
        gameTitle           : "Towers",
        btnClear            : "Hapus",
        btnFinish           : "Selesai",
        toolSmall           : "Kabel Kecil",
        toolLarge           : "Kabel Besar",
        toolTowerCable      : "Kabel Menara",
        toolExtraTower      : "Menara Tambahan",
        labelScore          : "Skor",
        labelBuildCostTime  : "Biaya/Waktu Bangun",
        labelDrawTime       : "Waktu Gambar",
        labelCapacityServed : "Kapasitas Terlayani",
        labelRiverCrossings : "Lintasan Sungai",
        rulesTitle          : "Aturan",
        rule1               : 'Hubungkan seluruh ubin Kapasitas dalam jarak 15 panjang kabel dari salah satu <span class="text-[#fa3232] dark:text-[#fa9696]">Menara</span> dan minimalkan biaya/waktu bangun',
        rule2               : 'Bentangkan <b class="text-slate-900 dark:text-white">Kabel Kecil/Besar</b> dari <b class="text-[#fa3232] dark:text-[#fa9696]">Menara</b> ke ubin <b class="text-slate-900 dark:text-white">Kapasitas</b>, atau tempatkan <b class="text-[#fa3232] dark:text-[#fa9696]">Menara Tambahan</b> dan hubungkan dengan <b class="text-[#fa3232] dark:text-[#fa9696]">Kabel Menara</b>',
        rule3               : 'Ubin <b class="text-[#329632] dark:text-[#96fa96]">Gunung</b> tidak bisa dibanguni',
        rule4               : 'Membentangkan kabel di atas ubin <b class="text-[#323296] dark:text-[#9696fa]">Sungai</b> berharga 40/30 per ubin-kabel',
        rule5               : 'Klik <span class="inline-flex items-center gap-1 bg-[#329632] text-white px-2 py-0.5 rounded text-xs font-bold shadow-sm"><i class="fa-solid fa-circle-check"></i> Selesai</span> setelah semua ubin <b class="text-slate-900 dark:text-white">Kapasitas</b> terlayani sepenuhnya untuk mengunci skor (Biaya &times; Waktu Bangun + Waktu Gambar)',
        btnDownloadMap      : "Unduh",
        btnKeepPlaying      : "Tutup",
        btnNextSeed         : "Lanjut",
        shareSeed           : "Seed",
        shareScore          : "Skor",
        shareBuildCost      : "Biaya Bangun",
        shareBuildTime      : "Waktu Bangun",
        shareDrawTime       : "Waktu Gambar"
    }
};