# Content changes

Every change made to the booklet text while turning *Synthesis_Booklet_Katherine_Zhang.pdf* into the online book. "p. N" is the page number shown in the book (page 1 = PDF page 3, right half). Block ids (for example `4R-2`) match the `data-id` attributes in `index.html`.

**Default rule:** English text was not rewritten. No English block needed a rewrite under the ±10% character-count rule, so the only edits to English wording are the clean-ups in sections 1–2.

## 1. Bracketed proofreading notes removed

| Page | Block | Before (end of block) | After | Reason |
|---|---|---|---|---|
| p. 15 (PDF p10 right) | `10R-6` | …al and scenic areas and historic sites.’ **[Removed extra space before “Conference”]** | …al and scenic areas and historic sites.’ | Leftover editor mark, not content |
| p. 15 (PDF p10 right) | `10R-13` | … of UNESCO in Paris on 16 November 1972. **[Corrected “united” to “United” and “Sweeden” to “Sweden”]** | … of UNESCO in Paris on 16 November 1972. | Leftover editor mark, not content |
| p. 16 (PDF p11 left) | `11L-2b` | …he protection and promotion of heritage. **[Capitalized “Participation”]** | …he protection and promotion of heritage. | Leftover editor mark, not content |
| p. 16 (PDF p11 left) | `11L-7` | …erships for World Heritage conservation. **[Changed ·World to “World and added closing quotation mark and comma]** | …erships for World Heritage conservation. | Leftover editor mark, not content |

A search of the finished `index.html` finds no `[Removed…]`, `[Corrected…]`, `[Capitalized…]` or `[Changed…]` notes.

## 2. Text-extraction artifacts fixed

PDF text extraction drops the hyphen (or adds a space) where a line breaks at a hyphen or slash. Line ends were rejoined so each word reads as printed.

| Page | Block | Before | After | Note |
|---|---|---|---|---|
| p. 3 (PDF p4 right) | `4R-4` | midMing | mid-Ming | Shown in English |
| p. 6 (PDF p6 left) | `6L-1` | UNESCOListed | UNESCO-Listed | Shown as the small English line under 九座世界遺產園林 |
| p. 17 (PDF p11 right) | `11R-8` | longterm | long-term | Shown in English |
| p. 18 (PDF p12 left) | `12L-7` | nongovernmental | non-governmental | Shown in English |
| p. 20 (PDF p13 left) | `13L-11` | Park/ Natural | Park/Natural | Line break after the slash; shown in the small English label |
| p. 13 (PDF p9 right) | `9R-10` | ongoing | on-going | UNESCO's own spelling in criterion (ix); also in (viii) |

## 3. Chinese body text (Traditional Chinese, Noto Serif TC)

Every second body block was first translated into Chinese. On request the amount of Chinese body text was then halved: going through the book in reading order, the 1st, 3rd, 5th … Chinese body block (garden entries included) stays Chinese and the others are back in their original English. That leaves 26 Chinese body blocks; the table lists them. Headings, labels and all nine garden names stay bilingual. Each Chinese block sits in the original text box (same left edge, width and first baseline) and was checked in the browser to end inside the original box height. Chinese body is 10pt, above the 11px-equivalent floor.

Reverted to English (unchanged original text): p. 2 (PDF p4 left) `4L-1`, p. 3 (PDF p4 right) `4R-4`, p. 5 (PDF p5 right) `5R-2`, p. 5 (PDF p5 right) `5R-7`, p. 6 (PDF p6 left) `6L-2`, p. 6 (PDF p6 left) `6L-6`, p. 8 (PDF p7 left) `7L-1`, p. 8 (PDF p7 left) `7L-10`, p. 9 (PDF p7 right) `7R-6`, p. 10 (PDF p8 left) `8L-4`, p. 11 (PDF p8 right) `8R-5`, p. 12 (PDF p9 left) `9L-4`, p. 12 (PDF p9 left) `9L-8`, p. 13 (PDF p9 right) `9R-5`, p. 13 (PDF p9 right) `9R-9`, p. 14 (PDF p10 left) `10L-3`, p. 15 (PDF p10 right) `10R-10`, p. 16 (PDF p11 left) `11L-2b`, p. 16 (PDF p11 left) `11L-7`, p. 17 (PDF p11 right) `11R-8`, p. 18 (PDF p12 left) `12L-5`, p. 19 (PDF p12 right) `12R-4`, p. 20 (PDF p13 left) `13L-5`, p. 20 (PDF p13 left) `13L-13`, p. 21 (PDF p13 right) `13R-6`, p. 22 (PDF p14 left) `14L-2`.

| Page | Block | Before (English) | After (Chinese) |
|---|---|---|---|
| p. 1 (PDF p3 right) | `3R-1` | The Classical Gardens of Suzhou represent the pinnacle of Chinese garden design, embodying over 2,000 years of cultural and artistic development. | 蘇州古典園林是中國造園藝術的巔峰，凝聚了兩千多年的文化與藝術積澱。 |
| p. 3 (PDF p4 right) | `4R-2` | Today, 69 of these classical gardens remain preserved in Suzhou, all designated as protected “National Heritage Sites”. The nine gardens included in the UNESCO World Heritage designation represent the finest examples of Chinese “Mountain and Water” gardens, showcasing the evolution of this unique art form. | 如今，蘇州仍保存著六十九座古典園林，全部列為國家級文物保護單位。其中列入聯合國教科文組織世界遺產的九座園林，是中國「山水園林」的最佳典範，展現了這門獨特藝術的演變歷程。 |
| p. 8 (PDF p7 left) | `7L-6` | Carefully arranged rocks, often from Taihu Lake, create artificial mountains and grottos. The Lion Grove Garden is famous for its rock formations resembling lions, with numerous hidden pathways and tunnels. | 精心堆疊的山石多取自太湖，構築出人造的山巒與洞壑。獅子林以形似群獅的假山聞名，其間暗道與隧洞縱橫。 |
| p. 9 (PDF p7 right) | `7R-3b` | The gardens reflect Taoist principles of harmony with nature, Confucian ideals of order and hierarchy, and Buddhist concepts of meditation and enlightenment. | 園林體現了道家天人合一的理念、儒家的秩序與等級觀念，以及佛家的禪修與覺悟思想。 |
| p. 10 (PDF p8 left) | `8L-2` | The United Nations Educational, Scientific and Cultural Organization (UNESCO) seeks to encourage the identification, protection, and preservation of cultural and natural heritage around the world considered to be of outstanding value to humanity. | 聯合國教育、科學及文化組織（UNESCO）致力於鼓勵世界各地識別、保護和保存對全人類具有突出價值的文化與自然遺產。 |
| p. 11 (PDF p8 right) | `8R-2` | Only countries that have signed the World Heritage Convention, pledging to protect their natural and cultural heritage, can submit nomination proposals for properties on their territory to be considered for inclusion in UNESCO’s World Heritage List. | 唯有簽署《世界遺產公約》、承諾保護本國自然與文化遺產的國家，方可為其境內的遺產地提交申報，以爭取列入《世界遺產名錄》。 |
| p. 12 (PDF p9 left) | `9L-2` | Encourage countries to sign the World Heritage Convention and to ensure the protection of their natural and cultural heritage; | 鼓勵各國簽署《世界遺產公約》，並確保其自然與文化遺產得到保護； |
| p. 12 (PDF p9 left) | `9L-6` | Provide emergency assistance for World Heritage sites in immediate danger; | 為面臨迫切危險的世界遺產地提供緊急援助； |
| p. 13 (PDF p9 right) | `9R-3` | (ii) exhibit an important interchange of human values, over a span of time or within a cultural area of the world, on developments in architecture or technology, monumental arts, town planning, or landscape design; | （二）在一段時期內或世界某一文化區域內，對建築、技術、紀念性藝術、城鎮規劃或景觀設計的發展產生重大影響，展現人類價值的重要交流； |
| p. 13 (PDF p9 right) | `9R-6` | (iv) be an outstanding example of a type of building, architectural or technological ensemble or landscape which illustrates (a) significant stage(s) in human history; | （四）是一種建築、建築群、技術整體或景觀的傑出範例，展現人類歷史上一個（或多個）重要階段； |
| p. 14 (PDF p10 left) | `10L-1` | (x) contain the most important and significant natural habitats for in-situ conservation of biological diversity, including those containing threatened species of outstanding universal value from the point of view of science or conservation. | （十）包含生物多樣性就地保護最重要、最具意義的自然棲息地，包括從科學或保育角度看具有突出普遍價值的瀕危物種棲息地。 |
| p. 15 (PDF p10 right) | `10R-7` | UNESCO spearheads an international campaign to save Venice after disastrous floods threatened the city. | 聯合國教科文組織發起國際行動，拯救遭受嚴重水災威脅的威尼斯。 |
| p. 15 (PDF p10 right) | `10R-13` | Following a United Nations Conference on the Human Environment in Stockholm, Sweden, in 1972 and the work of expert groups involving IUCN, ICOMOS and UNESCO, all the proposals came together in the Convention concerning the Protection of World Cultural and Natural Heritage, which was adopted by the General Conference of UNESCO in Paris on 16 November 1972. | 1972年聯合國人類環境會議於瑞典斯德哥爾摩召開；經世界自然保護聯盟、國際古蹟遺址理事會與教科文組織專家小組的努力，各方提案匯成《保護世界文化和自然遺產公約》，於同年11月16日在巴黎教科文組織大會上通過。 |
| p. 16 (PDF p11 left) | `11L-3b` | Marks the 20th Anniversary of the World Heritage Convention, the creation of the UNESCO World Heritage Centre, and the adoption of the cultural landscapes category by the World Heritage Committee, making the World Heritage Convention the first international legal instrument to recognize and protect cultural landscapes. | 適逢《世界遺產公約》通過二十週年，聯合國教科文組織世界遺產中心成立，世界遺產委員會亦增設文化景觀類別，使該公約成為首個認定並保護文化景觀的國際法律文書。 |
| p. 17 (PDF p11 right) | `11R-4` | The ancient Citadel and surrounding cultural landscape of the Iranian city of Bam, where 26,000 people lost their lives in the earthquake of December 2003, was simultaneously inscribed on UNESCO’s World Heritage List and on the List of World Heritage in Danger in 2004. Important international efforts are mobilized to salvage the cultural heritage of this devastated city. | 伊朗巴姆古城堡及其周邊文化景觀，於2003年12月的地震中有二萬六千人罹難；2004年，該地同時列入聯合國教科文組織《世界遺產名錄》與《瀕危世界遺產名錄》。國際社會正全力搶救這座受創城市的文化遺產。 |
| p. 18 (PDF p12 left) | `12L-1` | Representing an outstanding and rare example of medieval architecture at the crossroad of the many different cultures in the region, the Walled City of Baku sustained significant damage during the earthquake of November 2000 and has been increasingly affected by the pressure of urban development, the absence of conservation policies and by questionable restoration efforts. For these reasons it was inscribed on the List of World Heritage in Danger in 2003. Since then, UNESCO has been working with the State Party and the Advisory Bodies to set up a plan of action to address the conservation issues as well as with stakeholders to coordinate the implementation of safeguarding measures. | 巴庫城牆古城是位於多元文化交匯處、罕見而傑出的中世紀建築典範。該城在2000年11月的地震中嚴重受損，並日益受到城市開發壓力、保護政策缺失及不當修復的影響，因此於2003年被列入《瀕危世界遺產名錄》。此後，聯合國教科文組織一直與締約國及諮詢機構合作，制定解決保護問題的行動計畫，並與各利益相關方協調落實保護措施。 |
| p. 19 (PDF p12 right) | `12R-2` | The World Heritage Convention is not only ‘words on paper’ but is above all a useful instrument for concrete action in preserving threatened sites and endangered species. | 《世界遺產公約》不僅是「紙上文字」，更是保護瀕危遺址與物種的有力行動工具。 |
| p. 20 (PDF p13 left) | `13L-2` | Often, the World Heritage Committee and the States Parties, with the assistance of UNESCO experts and other partners, find solutions before a given situation deteriorates to an extent that would damage the site. | 世界遺產委員會與締約國常在聯合國教科文組織專家及其他夥伴協助下，於情況惡化至損害遺產之前找到解決方案。 |
| p. 20 (PDF p13 left) | `13L-9` | In 1999, the World Heritage community campaigned against a plan for enlarging an existing salt factory to commercial scale in Laguna San Ignacio in El Vizcaino Bay, the last pristine reproduction lagoon for the Pacific grey whale. The World Heritage Committee forewarned the Mexican Government of the threats posed to the marine and terrestrial ecosystems, the grey whales as key species as well as the overall integrity of this World Heritage site by locating saltworks inside the Sanctuary. As a result, the Mexican Government refused permission for the saltworks in March 2000. | 1999年，世界遺產界發起行動，反對在埃爾比斯卡伊諾灣聖伊格納西奧潟湖將一座鹽場擴建至商業規模——該潟湖是太平洋灰鯨最後一處未受破壞的繁殖地。世界遺產委員會預先警告墨西哥政府：在保護區內設置鹽場，將威脅海洋與陸地生態系統、作為關鍵物種的灰鯨，以及該遺產地的整體完整性。墨西哥政府遂於2000年3月否決了鹽場計畫。 |
| p. 21 (PDF p13 right) | `13R-3` | Illicit excavation, pillaging of archaeological sites and landmines were the main problems. The World Heritage Committee, having noted that these threats to the site no longer existed and that the numerous conservation and restoration activities coordinated by UNESCO were successful, removed the site from the List of World Heritage in Danger in 2004. | 盜掘、遺址劫掠與地雷曾是主要問題。世界遺產委員會確認上述威脅已不復存在，且聯合國教科文組織協調的多項保護與修復工作卓有成效，遂於2004年將該地從《瀕危世界遺產名錄》中移除。 |
| p. 21 (PDF p13 right) | `13R-9` | By 1989, thanks to continuous monitoring and technical cooperation projects, the situation had improved and the site was removed from the List of World Heritage in Danger. | 經持續監測與技術合作，至1989年情況已有改善，該地遂從《瀕危世界遺產名錄》中移除。 |

## 4. Garden entries (Chinese body, English name as subtitle)

Every garden name is now Chinese, with the English name as a small subtitle above the red rule. For the gardens listed here the body is in Chinese too, with bilingual Built/Size labels (建於 / Built, 面積 / Size). The other gardens keep their English body and appear in section 5.

| Page | Blocks | Before (English) | After (Chinese) |
|---|---|---|---|
| p. 5 (PDF p5 right) | `5R-1` + `5R-4` | **Humble Administrator’s Garden**. Built: 1509 (Ming Dynasty) \| Size: 52,000 m² The largest and most famous garden in Suzhou. Features vast ponds, pavilions, and interconnected spaces, creating a harmonious landscape inspired by traditional Chinese paintings. | **拙政園** (Humble Administrator’s Garden) · 建於 1509年（明代） ｜ 面積 52,000 m² · 蘇州規模最大、最負盛名的園林。池水浩渺，亭臺錯落，空間迴環相通，構成一幅宛如傳統山水畫的和諧景致。 |
| p. 5 (PDF p5 right) | `5R-5` + `5R-6` | **Lingering Garden**. Built: 1593 (Ming Dynasty) \| Size: 23,300 m² Known for its intricate rock formations, elegant pavilions, and winding corridors that create an illusion of endless space. Divided into four distinct sections, each highlighting different garden elements: rocks, water, plants, and architecture. | **留園** (Lingering Garden) · 建於 1593年（明代） ｜ 面積 23,300 m² · 以繁複的疊石、雅致的亭閣與曲折的迴廊著稱，營造出空間無盡的幻覺。全園分為四區，分別突出山石、水景、花木與建築。 |
| p. 5 (PDF p5 right) | `5R-9` + `5R-10` | **Lion Grove Garden**. Built: 1342 (Yuan Dynasty) \| Size: 10,000 m² Renowned for its maze-like rock formations, made of Taihu lake stones, resembling lions. A paradise for explorers, with numerous hidden pathways and tunnels. Originally built by a Buddhist monk in honor of his teacher, integrating Zen philosophy into its design. | **獅子林** (Lion Grove Garden) · 建於 1342年（元代） ｜ 面積 10,000 m² · 以迷宮般的太湖石假山聞名，石形宛如群獅。園中暗道洞穴密佈，是探幽者的樂園。原為一位僧人為紀念其師而建，將禪宗哲理融入造園。 |
| p. 6 (PDF p6 left) | `6L-3` + `6L-5` | **The Garden of Cultivation**. Built: 16th Century (Ming Dynasty) \| Size: 3,900 m² A hidden gem, known for its serene and minimalistic design. Reflects the philosophy of Daoism and Confucianism, with spaces designed for meditation and poetry. | **藝圃** (The Garden of Cultivation) · 建於 十六世紀（明代） ｜ 面積 3,900 m² · 一處隱逸瑰寶，以寧靜簡約的設計著稱。園林體現道家與儒家思想，空間專為冥想與吟詠而設。 |
| p. 6 (PDF p6 left) | `6L-8` + `6L-9` | **Mountain Villa with Embracing Beauty**. Built: 1889 (Qing Dynasty) \| Size: 2,700 m² Now housed within the Embroidery Museum, this garden was once the residence of a Qing dynasty official. Known particularly for its rockwork that creates an effect of it being a much larger space than it actually is. | **環秀山莊** (Mountain Villa with Embracing Beauty) · 建於 1889年（清代） ｜ 面積 2,700 m² · 現位於刺繡博物館內，昔日為一位清代官員的宅邸。尤以假山疊石著稱，令園林顯得遠比實際廣闊。 |

## 5. Bilingual headings and labels

Every heading and label now shows Chinese large with the original English small beneath it. The English wording is unchanged.

| Page | Block | Before | After |
|---|---|---|---|
| p. 1 (PDF p3 right) | `3R-2` | UNESCO World Heritage Site | 聯合國教科文組織世界遺產 / UNESCO World Heritage Site |
| p. 1 (PDF p3 right) | `3R-3` | China | 中國 / China |
| p. 3 (PDF p4 right) | `4R-1` | Historical Context | 歷史脈絡 / Historical Context |
| p. 4 (PDF p5 left) | `5L-1` | UNESCO World Heritage Status | 世界遺產地位 / UNESCO World Heritage Status |
| p. 5 (PDF p5 right) | `5R-2` | Master of the Nets Garden | 網師園 / Master of the Nets Garden |
| p. 5 (PDF p5 right) | `5R-7` | The Couple’s Retreat Garden | 耦園 / The Couple’s Retreat Garden |
| p. 6 (PDF p6 left) | `6L-1` | The Nine UNESCO-Listed Gardens | 九座世界遺產園林 / The Nine UNESCO-Listed Gardens |
| p. 6 (PDF p6 left) | `6L-2` | Canglang Pavilion | 滄浪亭 / Canglang Pavilion |
| p. 6 (PDF p6 left) | `6L-6` | The Garden of the Retreat and Reflection | 退思園 / The Garden of the Retreat and Reflection |
| p. 7 (PDF p6 right) | `6R-3` | Garden Poetry and Literature | 園林詩文 / Garden Poetry and Literature |
| p. 8 (PDF p7 left) | `7L-2` | Water Features: | 水景 / Water Features: |
| p. 8 (PDF p7 left) | `7L-3` | Corridors and Bridges: | 廊橋 / Corridors and Bridges: |
| p. 8 (PDF p7 left) | `7L-5` | Rockeries: | 假山 / Rockeries: |
| p. 8 (PDF p7 left) | `7L-7` | Architectural Elements | 建築元素 / Architectural Elements |
| p. 8 (PDF p7 left) | `7L-9` | Plants: | 花木 / Plants: |
| p. 8 (PDF p7 left) | `7L-11` | Pavilions and Halls: | 亭臺樓閣 / Pavilions and Halls: |
| p. 9 (PDF p7 right) | `7R-1` | Cultural Significance | 文化意義 / Cultural Significance |
| p. 9 (PDF p7 right) | `7R-2a` | Scholarly Retreat: | 文人隱逸 / Scholarly Retreat: |
| p. 9 (PDF p7 right) | `7R-3a` | Philosophical Expression: | 哲學表達 / Philosophical Expression: |
| p. 9 (PDF p7 right) | `7R-4a` | Artistic Integration: | 藝術融合 / Artistic Integration: |
| p. 9 (PDF p7 right) | `7R-5` | Social Function: | 社交功能 / Social Function: |
| p. 10 (PDF p8 left) | `8L-1` | Mission Statement | 使命宣言 / Mission Statement |
| p. 11 (PDF p8 right) | `8R-1` | The Nomination Process | 申報程序 / The Nomination Process |
| p. 11 (PDF p8 right) | `8R-3` | The criteria for selection | 遴選標準 / The criteria for selection |
| p. 12 (PDF p9 left) | `9L-1` | UNESCO’s World Heritage mission is to: | 世界遺產的使命 / UNESCO’s World Heritage mission is to: |
| p. 13 (PDF p9 right) | `9R-1` | Selection criteria: | 評選標準 / Selection criteria: |
| p. 15 (PDF p10 right) | `10R-1` | A Brief History | 簡史 / A Brief History |
| p. 17 (PDF p11 right) | `11R-1` | List of World Heritage Sites in Danger | 瀕危世界遺產名錄 / List of World Heritage Sites in Danger |
| p. 17 (PDF p11 right) | `11R-3` | Some illustrative cases of sites inscribed on the List of World Heritage in Danger: | 列入瀕危名錄的若干案例： / Some illustrative cases of sites inscribed on the List of World Heritage in Danger: |
| p. 17 (PDF p11 right) | `11R-5` | City of Bam in the Islamic Republic of Iran: | 伊朗伊斯蘭共和國巴姆城 / City of Bam in the Islamic Republic of Iran: |
| p. 17 (PDF p11 right) | `11R-7` | Bamiyan Valley in Afghanistan: | 阿富汗巴米揚山谷 / Bamiyan Valley in Afghanistan: |
| p. 17 (PDF p11 right) | `11R-9` | Kathmandu Valley in Nepal: | 尼泊爾加德滿都谷地 / Kathmandu Valley in Nepal: |
| p. 18 (PDF p12 left) | `12L-2` | Walled City of Baku in Azerbaijan: | 亞塞拜然巴庫城牆古城 / Walled City of Baku in Azerbaijan: |
| p. 18 (PDF p12 left) | `12L-4` | Historic Town of Zabid in Yemen: | 葉門宰比德歷史古城 / Historic Town of Zabid in Yemen: |
| p. 18 (PDF p12 left) | `12L-6` | Rio Platano Biosphere Reserve in Honduras: | 宏都拉斯里奧普拉塔諾生物圈保護區 / Rio Platano Biosphere Reserve in Honduras: |
| p. 18 (PDF p12 left) | `12L-8` | National Parks of Garamba, Kahuzi-Biega, Salonga, Virunga and the Okapi Wildlife Reserve in the Democratic Republic of the Congo: | 剛果民主共和國五處國家公園及保護區 / National Parks of Garamba, Kahuzi-Biega, Salonga, Virunga and the Okapi Wildlife Reserve in the Democratic Republic of the Congo: |
| p. 19 (PDF p12 right) | `12R-1` | SUCCESS STORIES | 成功案例 / SUCCESS STORIES |
| p. 20 (PDF p13 left) | `13L-1` | Finding Solutions | 尋求解決之道 / Finding Solutions |
| p. 20 (PDF p13 left) | `13L-3` | Giza Pyramids in Egypt: | 埃及吉薩金字塔 / Giza Pyramids in Egypt: |
| p. 20 (PDF p13 left) | `13L-6` | Royal Chitwan National Park in Nepal: | 尼泊爾皇家奇特旺國家公園 / Royal Chitwan National Park in Nepal: |
| p. 20 (PDF p13 left) | `13L-8` | Archaeological Site of Delphi in Greece: | 希臘德爾斐考古遺址 / Archaeological Site of Delphi in Greece: |
| p. 20 (PDF p13 left) | `13L-10` | Whale Sanctuary of El Vizcaino in Mexico: | 墨西哥埃爾比斯卡伊諾鯨魚保護區 / Whale Sanctuary of El Vizcaino in Mexico: |
| p. 20 (PDF p13 left) | `13L-11` | Mount Kenya National Park/Natural Forest in Kenya: | 肯亞山國家公園／自然森林 / Mount Kenya National Park/Natural Forest in Kenya: |
| p. 21 (PDF p13 right) | `13R-1` | Successful restorations | 成功修復 / Successful restorations |
| p. 21 (PDF p13 right) | `13R-4` | Angkor in Cambodia: | 柬埔寨吳哥 / Angkor in Cambodia: |
| p. 21 (PDF p13 right) | `13R-7` | Old City of Dubrovnik in Croatia: | 克羅埃西亞杜布羅夫尼克古城 / Old City of Dubrovnik in Croatia: |
| p. 21 (PDF p13 right) | `13R-10` | Ngorongoro Conservation Area in the United Republic of Tanzania: | 坦尚尼亞聯合共和國恩戈羅恩戈羅保護區 / Ngorongoro Conservation Area in the United Republic of Tanzania: |
| p. 22 (PDF p14 left) | `14L-1` | Wieliczka Salt Mine in Poland: | 波蘭維利奇卡鹽礦 / Wieliczka Salt Mine in Poland: |
| p. 2 (PDF p4 left) | `4L-3` | UNESCO World Heritage Centre / 7, Place de Fontenoy / 75352 Paris 07 SP France | 聯合國教科文組織世界遺產中心 / 7, Place de Fontenoy / 75352 Paris 07 SP France (the postal address stays as printed) |
| p. 2 (PDF p4 left) | `4L-4` | Tel: … / Fax: … / E-mail: … / http://whc.unesco.com | 電話 Tel … / 傳真 Fax … / 電郵 E-mail … / 網址 Web http://whc.unesco.com. A label (網址 / Web) was **added** to the URL line, which had none, so all four lines match. |

Not translated: the timeline years (1959 … 2002). They are numerals and read the same in both languages.

## 6. Cover and layout adaptations (no text change)

- **Cover (PDF p2 left):** the booklet's own cover layout is kept: both photographs, the fan-shaped lattice logo and the caption *Classical Gardens of Suzhou*, each at its original position, with 蘇州古典園林 added directly beneath the caption. It sits on a muted red cloth cover with the four-hole thread binding. The logo and caption are cream instead of the original red and black so they read on the red cloth. The back cover uses the same red cloth.
- **Removed blank pages:** the two blank endpapers after the cover (PDF p2 right, p3 left), the inside covers, and the blank pages at the end (PDF p14 right, p15 left, p15 right, and the blank back of the last sheet). The all-blank PDF page 1 and the crop marks are not used.
- **Page alignment:** odd pages are on the left and even pages on the right. Page 1 is printed on the back of the cover, so opening the book shows pages 1–2, page 15 faces page 16, and page 22 backs onto the back cover. The book has 22 numbered pages.
- **Fonts:** all Latin text is Helvetica (Helvetica Neue, then Helvetica), with Google Sans from Google Fonts where Helvetica is not installed. Helvetica runs about 12% wider than the Times New Roman of the PDF, so English body text is set at 9pt instead of 10pt to keep every block inside its original text box (checked in the browser: no block overflows). Headings and labels keep their PDF sizes. Chinese stays in Noto Serif TC.
- **Heading spacing:** `13L-1` (尋求解決之道) is set at 22pt rather than 24pt and nudged up 1pt so it clears the section mark above and the paragraph below.
