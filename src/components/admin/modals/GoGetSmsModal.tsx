import React, { useState, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi';
import BaseModal from './BaseModal';
import Button from '../../ui/Button';
import { useToast } from '../../../hooks/useToast';
import type { ProviderModalProps, ServiceOption, CountryOption, TimeOption } from './types';

// Searchable Select Component
interface SearchableSelectProps {
  options: (ServiceOption | CountryOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    const filtered = options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [searchTerm, options]);

  const selectedOption = options.find(option => option.code === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
          bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
          cursor-pointer flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 dark:hover:border-blue-400'}
          ${isOpen ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500 dark:ring-blue-400' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
            >
              <FiX className="h-3 w-3" />
            </button>
          )}
          <FiChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.code}
                  className={`
                    px-3 py-2 cursor-pointer text-sm
                    ${value === option.code 
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100'
                    }
                  `}
                  onClick={() => handleSelect(option.code)}
                >
                  <div className="font-medium">{option.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Code: {option.code}</div>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Keine Ergebnisse gefunden
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const GoGetSmsModal: React.FC<ProviderModalProps> = ({ isOpen, onClose, onRent, loading = false }) => {
  const [mode, setMode] = useState<'activation' | 'rental'>('activation');
  const [service, setService] = useState('go');
  const [country, setCountry] = useState('43');
  const [rentTime, setRentTime] = useState('4');

  const { showToast } = useToast();

  // Complete GoGetSMS activation services (single SMS, cheaper) - FULL API documentation list
  const activationServices: ServiceOption[] = [
    { code: 'ot', name: 'OTHER (nicht garantiert)' },
    { code: 'go', name: 'Google, YouTube, Gmail' },
    { code: 'wa', name: 'WhatsApp' },
    { code: 'tg', name: 'Telegram' },
    { code: 'fb', name: 'Facebook' },
    { code: 'ig', name: 'Instagram' },
    { code: 'mm', name: 'Microsoft' },
    { code: 'oi', name: 'Tinder' },
    { code: 'lf', name: 'TikTok/Douyin' },
    { code: 'am', name: 'Amazon' },
    { code: 'mb', name: 'Yahoo' },
    { code: 'ts', name: 'PayPal' },
    { code: 'vk', name: 'VK.com' },
    { code: 'ds', name: 'Discord' },
    { code: 'hw', name: 'Alipay/Alibaba' },
    { code: 'tw', name: 'Twitter' },
    { code: 'wx', name: 'Apple' },
    { code: 'dh', name: 'eBay' },
    { code: 'mt', name: 'Steam' },
    { code: 'wb', name: 'WeChat' },
    { code: 'vi', name: 'Viber' },
    { code: 'vz', name: 'Hinge' },
    { code: 'li', name: 'Baidu' },
    { code: 'nv', name: 'Naver' },
    { code: 'dr', name: 'OpenAI / Chat GPT' },
    { code: 'yw', name: 'Grindr' },
    { code: 'mj', name: 'Zalo' },
    { code: 'pm', name: 'AOL' },
    { code: 'pf', name: 'pof.com' },
    { code: 'me', name: 'Line msg' },
    { code: 'bw', name: 'Signal' },
    { code: 'ew', name: 'Nike' },
    { code: 'gp', name: 'Ticketmaster' },
    { code: 'tn', name: 'LinkedIN' },
    { code: 'fu', name: 'Snapchat' },
    { code: 'ub', name: 'Uber' },
    { code: 'tx', name: 'Bolt' },
    { code: 'kc', name: 'Vinted' },
    { code: 'ua', name: 'BlaBlaCar' },
    { code: 'cn', name: 'Fiverr' },
    { code: 'bz', name: 'Blizzard' },
    { code: 'ie', name: 'bet365' },
    { code: 'vm', name: 'OkCupid' },
    { code: 'qq', name: 'Tencent QQ' },
    { code: 'mo', name: 'Bumble' },
    { code: 'kt', name: 'KakaoTalk' },
    { code: 'wh', name: 'TanTan' },
    { code: 'rr', name: 'Wolt' },
    { code: 'yi', name: 'Yemeksepeti' },
    { code: 'nz', name: 'Foodpanda' },
    { code: 'do', name: 'Leboncoin' },
    { code: 'dl', name: 'Lazada' },
    { code: 'ma', name: 'Mail.ru' },
    { code: 'ka', name: 'Shopee' },
    { code: 'rc', name: 'Skype' },
    { code: 'abk', name: 'GMX' },
    { code: 'ahb', name: 'Ubisoft' },
    { code: 'zk', name: 'Deliveroo' },
    { code: 'uf', name: 'Eneba' },
    { code: 'hx', name: 'AliExpress' },
    { code: 'za', name: 'JDcom' },
    { code: 'ta', name: 'Wink' },
    { code: 'jq', name: 'Paysafecard' },
    { code: 'bo', name: 'Wise' },
    { code: 're', name: 'Coinbase (nicht garantiert)' },
    { code: 'abe', name: 'Foodora' },
    { code: 'acz', name: 'Claude' },
    { code: 'sg', name: 'Ozon' },
    { code: 'aq', name: 'Glovo' },
    { code: 'qd', name: 'Taobao' },
    { code: 'im', name: 'Imo' },
    { code: 'uk', name: 'Airbnb' },
    { code: 'agm', name: 'Coffee Meets Bagel (CMB)' },
    { code: 'lc', name: 'Subito.it' },
    { code: 'ue', name: 'Onet' },
    { code: 'ok', name: 'Odnoklassniki' },
    { code: 'abc', name: 'Taptap Send' },
    { code: 'ex', name: 'Linode' },
    { code: 'agb', name: 'Smiles' },
    { code: 'fd', name: 'Mamba' },
    { code: 'vd', name: 'Betfair' },
    { code: 'bx', name: 'dosi' },
    { code: 'jg', name: 'Grab' },
    { code: 'qb', name: 'Payberry' },
    { code: 'ck', name: 'BeReal' },
    { code: 'ya', name: 'Yandex' },
    { code: 'nf', name: 'Netflix' },
    { code: 'mv', name: 'Fruitz' },
    { code: 'wo', name: 'Parkplus' },
    { code: 'df', name: 'Happn' },
    { code: 'sn', name: 'OLX' },
    { code: 'ni', name: 'Gojek' },
    { code: 'bc', name: 'gcash' },
    { code: 'qf', name: 'RedBook' },
    { code: 'yl', name: 'Yalla' },
    { code: 'kk', name: 'Idealista.com' },
    { code: 'ajy', name: 'All Access' },
    { code: 'fr', name: 'Dana' },
    { code: 'afz', name: 'Klarna' },
    { code: 'ac', name: 'DoorDash' },
    { code: 'kf', name: 'Weibo' },
    { code: 'yq', name: 'Mail.com' },
    { code: 'akl', name: 'DOKU' },
    { code: 'hb', name: 'Twitch' },
    { code: 'tl', name: 'Truecaller' },
    { code: 'yr', name: 'Miravia' },
    { code: 'ab', name: 'Alibaba' },
    { code: 'te', name: 'EFood' },
    { code: 'cb', name: 'Bazos' },
    { code: 'ul', name: 'Getir' },
    { code: 'ads', name: 'GoChat' },
    { code: 'are', name: 'Seated' },
    { code: 'zs', name: 'Bilibili' },
    { code: 'gx', name: 'Hepsiburadacom' },
    { code: 'ags', name: 'Abbott' },
    { code: 'abo', name: 'WEBDE' },
    { code: 'ib', name: 'Immowelt' },
    { code: 'wk', name: 'Mobile01' },
    { code: 'yu', name: 'Xiaomi' },
    { code: 'abu', name: 'BPJSTK' },
    { code: 'wp', name: '163com' },
    { code: 'ayk', name: 'radquest' },
    { code: 'gj', name: 'Carousell' },
    { code: 'qj', name: 'Whoosh' },
    { code: 'ij', name: 'Revolut' },
    { code: 'ae', name: 'myGLO' },
    { code: 'abv', name: 'ABV BG' },
    { code: 'nc', name: 'Payoneer' },
    { code: 'ju', name: 'Indomaret' },
    { code: 'vp', name: 'Kwai' },
    { code: 'qw', name: 'Qiwi' },
    { code: 'xk', name: 'DiDi' },
    { code: 'fk', name: 'BLIBLI' },
    { code: 'dp', name: 'ProtonMail' },
    { code: 'bp', name: 'GoFundMe' },
    { code: 'cw', name: 'PaddyPower' },
    { code: 'pr', name: 'Trendyol' },
    { code: 'dv', name: 'NoBroker' },
    { code: 'fs', name: 'Şikayet var' },
    { code: 'aik', name: 'ZUS Coffee' },
    { code: 'abt', name: 'ArenaPlus' },
    { code: 'abq', name: 'Upwork' },
    { code: 'dn', name: 'Paxful' },
    { code: 'lj', name: 'Santander' },
    { code: 'xh', name: 'OVO' },
    { code: 'akr', name: 'Voi' },
    { code: 'axq', name: 'Eventbrite' },
    { code: 'xy', name: 'Depop' },
    { code: 'agv', name: 'DoneDeal' },
    { code: 'bl', name: 'BIGO LIVE' },
    { code: 'ayc', name: 'HungerStation' },
    { code: 'zh', name: 'Zoho' },
    { code: 'ada', name: 'TRUTH SOCIAL' },
    { code: 'tr', name: 'Paysend' },
    { code: 'qv', name: 'Badoo' },
    { code: 'ti', name: 'Crypto.com' },
    { code: 'tc', name: 'Rambler' },
    { code: 'ca', name: 'SuperS' },
    { code: 'tv', name: 'Flink' },
    { code: 'tu', name: 'Lyft' },
    { code: 'agk', name: 'Ipsos iSay' },
    { code: 'ahe', name: 'Bunq' },
    { code: 'ee', name: 'Twilio' },
    { code: 'av', name: 'avito' },
    { code: 'zn', name: 'Biedronka' },
    { code: 'iq', name: 'icq' },
    { code: 'agl', name: 'Betano' },
    { code: 'xd', name: 'Tokopedia' },
    { code: 'asy', name: 'Fore Coffee' },
    { code: 'aem', name: 'AstraPay' },
    { code: 'il', name: 'IQOS' },
    { code: 'wg', name: 'Skout' },
    { code: 'ym', name: 'Youla' },
    { code: 'zp', name: 'Pinduoduo' },
    { code: 'oz', name: 'Poshmark' },
    { code: 'afy', name: 'Tuul' },
    { code: 'adt', name: 'Willhaben' },
    { code: 'cq', name: 'Mercado' },
    { code: 'hu', name: 'Ukrnet' },
    { code: 'ff', name: 'AVON' },
    { code: 'cp', name: 'Uklon' },
    { code: 'hs', name: 'Asda' },
    { code: 'ano', name: 'Shopify' },
    { code: 'aix', name: 'Move It' },
    { code: 'aag', name: 'Pockit' },
    { code: 'jd', name: 'GiraBank' },
    { code: 'bhe', name: 'Jagocoffee' },
    { code: 'aol', name: 'Paysera' },
    { code: 'agi', name: 'Njuškalo' },
    { code: 'anh', name: 'Cadbury' },
    { code: 'pz', name: 'Lidl' },
    { code: 'yn', name: 'Allegro' },
    { code: 'apd', name: '2dehands' },
    { code: 'br', name: 'Вкусно и точка' },
    { code: 'rt', name: 'hily' },
    { code: 'll', name: '888casino' },
    { code: 'aps', name: 'Skelbiu' },
    { code: 'cm', name: 'Prom' },
    { code: 'rl', name: 'inDriver' },
    { code: 'hn', name: '1688' },
    { code: 'bmi', name: 'Sisal' },
    { code: 'zo', name: 'Kaggle' },
    { code: 'km', name: 'Rozetka' },
    { code: 'ho', name: 'Cathay' },
    { code: 'eu', name: 'LiveScore' },
    { code: 'agj', name: 'Marktplaats' },
    { code: 'gq', name: 'Freelancer' },
    { code: 'aeu', name: 'TheFork' },
    { code: 'uu', name: 'Wildberries' },
    { code: 'zb', name: 'FreeNow' },
    { code: 'bn', name: 'Alfagift' },
    { code: 'xx', name: 'Joyride' },
    { code: 'uz', name: 'OffGamers' },
    { code: 'ani', name: 'Talabat' },
    { code: 'pu', name: 'Justdating' },
    { code: 'oe', name: 'Codashop' },
    { code: 'wc', name: 'Craigslist' },
    { code: 'aup', name: 'BOTIM' },
    { code: 'jr', name: 'Самокат' },
    { code: 'app', name: 'ClassPass' },
    { code: 'ahd', name: 'OpenPhone' },
    { code: 'ns', name: 'OLDUBIL' },
    { code: 'qx', name: 'WorldRemit' },
    { code: 'aqy', name: 'SAPO' },
    { code: 'vy', name: 'Meta' },
    { code: 'px', name: 'Nifty' },
    { code: 'xs', name: 'GroupMe' },
    { code: 'anl', name: 'AttaPoll' },
    { code: 'aly', name: 'Bebeclub' },
    { code: 'cv', name: 'WashXpress' },
    { code: 'yj', name: 'eWallet' },
    { code: 'zf', name: 'OnTaxi' },
    { code: 'ars', name: 'Bingo Plus' },
    { code: 'pp', name: 'Huya' },
    { code: 'gd', name: 'Surveytime' },
    { code: 'apf', name: 'Carrefour' },
    { code: 'ang', name: 'TOMORO COFFEE' },
    { code: 'ji', name: 'Monobank' },
    { code: 'avb', name: 'Tealive' },
    { code: 'fz', name: 'KFC' },
    { code: 'sd', name: 'dodopizza' },
    { code: 'jy', name: 'Sorare' },
    { code: 'mg', name: 'Магнит' },
    { code: 'mx', name: 'SoulApp' },
    { code: 'et', name: 'Clubhouse' },
    { code: 'aiv', name: 'Striving in the Lion City' },
    { code: 'hm', name: 'Globus' },
    { code: 'avj', name: 'SumUp' },
    { code: 'ahr', name: 'This Fate' },
    { code: 'gc', name: 'TradingView' },
    { code: 'afc', name: 'Bunda' },
    { code: 'sw', name: 'NCsoft' },
    { code: 'xr', name: 'Tango' },
    { code: 'kh', name: 'Bukalapak' },
    { code: 'fj', name: 'Potato Chat' },
    { code: 'th', name: 'WestStein' },
    { code: 'ane', name: 'Supercell' },
    { code: 'gr', name: 'Astropay' },
    { code: 'qz', name: 'Faceit' },
    { code: 'hy', name: 'Ininal' },
    { code: 'aco', name: 'AR Lens' },
    { code: 'aip', name: 'AfreecaTV' },
    { code: 'atz', name: 'Air India' },
    { code: 'ja', name: 'Weverse' },
    { code: 'alx', name: 'NutriClub' },
    { code: 'gt', name: 'Gett' },
    { code: 'ls', name: 'Careem' },
    { code: 'fv', name: 'Vidio' },
    { code: 'aon', name: 'Binance' },
    { code: 'qh', name: 'Oriflame' },
    { code: 'lx', name: 'DewuPoison' },
    { code: 'yk', name: 'СпортМастер' },
    { code: 'aez', name: 'Shein' },
    { code: 'ef', name: 'Nextdoor' },
    { code: 'bd', name: 'X5ID' },
    { code: 'azh', name: 'Vivid' },
    { code: 'ait', name: 'FeetFinder' },
    { code: 'my', name: 'Caixa Bank' },
    { code: 'aer', name: 'PlayerAuctions' },
    { code: 'aow', name: 'Geekay' },
    { code: 'no', name: 'Virgo' },
    { code: 'zd', name: 'Zilch' },
    { code: 'qy', name: 'Zhihu' },
    { code: 'ze', name: 'Shpock' },
    { code: 'uh', name: 'Yubo' },
    { code: 'wd', name: 'CasinoPlus' },
    { code: 'als', name: 'Greggs' },
    { code: 'aqt', name: 'Skrill' },
    { code: 'adu', name: 'Seznam' },
    { code: 'og', name: 'Okko' },
    { code: 'akd', name: 'Feels' },
    { code: 'bul', name: 'Openbank' },
    { code: 'agc', name: 'VIMpay' },
    { code: 'ayr', name: 'Superbet' },
    { code: 'rz', name: 'EasyPay' },
    { code: 'xf', name: 'LightChat' },
    { code: 'gg', name: 'PagSmile' },
    { code: 'jf', name: 'Likee' },
    { code: 'ow', name: 'Reg.ru' },
    { code: 'qn', name: 'Blued' },
    { code: 'gm', name: 'Mocospace' },
    { code: 'aka', name: 'LinkAja' },
    { code: 'ft', name: 'Букмекерск' },
    { code: 'mw', name: 'Transfergo' },
    { code: 'ah', name: 'EscapeFromTarkov' },
    { code: 'nq', name: 'Trip' },
    { code: 'eq', name: 'Qoo10' },
    { code: 'avk', name: 'Quoka' },
    { code: 'gs', name: 'SamsungShop' },
    { code: 'awv', name: 'wallapop' },
    { code: 'vr', name: 'MotorkuX' },
    { code: 'wl', name: 'YouGotaGift' },
    { code: 'sq', name: 'KuCoinPlay' },
    { code: 'aje', name: 'CupidMedia' },
    { code: 'ak', name: 'Douyu' },
    { code: 'fi', name: 'Dundle' },
    { code: 'aar', name: 'Bearwww' },
    { code: 'aav', name: 'Alchemy' },
    { code: 'mc', name: 'Michat' },
    { code: 'ry', name: 'McDonalds' },
    { code: 'aub', name: 'Smitten' },
    { code: 'gf', name: 'GoogleVoice' },
    { code: 'sk', name: 'Skroutz' },
    { code: 'ko', name: 'AdaKami' },
    { code: 'aga', name: 'Publi24' },
    { code: 'dt', name: 'Delivery Club' },
    { code: 'aeq', name: 'Godrej' },
    { code: 'azf', name: 'Welocalize' },
    { code: 'jc', name: 'IVI' },
    { code: 'py', name: 'Monese' },
    { code: 'bv', name: 'Metro' },
    { code: 'zu', name: 'BigC' },
    { code: 'ajn', name: 'Gopuff' },
    { code: 'bha', name: 'kopikenangan' },
    { code: 'agd', name: 'Grailed' },
    { code: 'rd', name: 'Lenta' },
    { code: 'wj', name: '1хbet' },
    { code: 'kq', name: 'FotoCasa' },
    { code: 'yx', name: 'JTExpress' },
    { code: 'aiw', name: 'СушиВёсла' },
    { code: 'aeo', name: 'Allofresh' },
    { code: 'anj', name: 'Gemini' },
    { code: 'ep', name: 'Temu' },
    { code: 'sc', name: 'Voggt' },
    { code: 'ws', name: 'Indodax' },
    { code: 'wr', name: 'Walmart' },
    { code: 'ajd', name: 'Bankera' },
    { code: 'yf', name: 'Citymobil' },
    { code: 'yo', name: 'Amasia' },
    { code: 'xv', name: 'Wish' },
    { code: 'aok', name: 'Neteller' },
    { code: 'ahf', name: 'Fugeelah' },
    { code: 'bke', name: 'footdistrict' },
    { code: 'qe', name: 'GG' },
    { code: 'afp', name: 'VFS GLOBAL' },
    { code: 'lw', name: 'MrGreen' },
    { code: 'ud', name: 'Disney' },
    { code: 'bex', name: 'Whatnot' },
    { code: 'abn', name: 'Namars' },
    { code: 'zy', name: 'NTTGame' },
    { code: 'kn', name: 'Verse' },
    { code: 'abl', name: 'Gpnbonus' },
    { code: 'si', name: 'Cita Previa' },
    { code: 'uv', name: 'BinBin' },
    { code: 'auz', name: 'Outlier' },
    { code: 'an', name: 'Adidas' },
    { code: 'nt', name: 'Sravni.ru' },
    { code: 'aeg', name: 'Flowwow' },
    { code: 'vc', name: 'Banqi' },
    { code: 'aor', name: 'OKX' },
    { code: 'bea', name: 'Binmo' },
    { code: 'xg', name: 'FortunaSK' },
    { code: 'alo', name: 'Profee' },
    { code: 'xz', name: 'Paycell' },
    { code: 'tm', name: 'Akulaku' },
    { code: 'agw', name: 'Adverts' },
    { code: 'ai', name: 'CELEBe' },
    { code: 'agn', name: 'Flik' },
    { code: 'akj', name: 'Easycash' },
    { code: 'dz', name: 'Dominos Pizza' },
    { code: 'dq', name: 'IceCasino' },
    { code: 'aev', name: 'BankKaro' },
    { code: 'lt', name: 'BitClout' },
    { code: 'ng', name: 'FunPay' },
    { code: 'afd', name: 'Astra Otoshop' },
    { code: 'amp', name: 'VerifyKit' },
    { code: 'qr', name: 'MEGA' },
    { code: 'jh', name: 'PingPong' },
    { code: 'rk', name: 'Fotka' },
    { code: 'ov', name: 'Beget' },
    { code: 'fh', name: 'Lalamove' },
    { code: 'mp', name: 'Winmasters' },
    { code: 'ui', name: 'RuTube' },
    { code: 'zr', name: 'Papara' },
    { code: 'fe', name: 'CliQQ' },
    { code: 'nu', name: 'Stripe' },
    { code: 'od', name: 'FWDMAX' },
    { code: 'bk', name: 'G2G' },
    { code: 'akp', name: 'Her' },
    { code: 'amb', name: 'Vercel' },
    { code: 'ip', name: 'Burger King' },
    { code: 'rx', name: 'Sheerid' },
    { code: 'zg', name: 'Setel' },
    { code: 'of', name: 'Urent' },
    { code: 'it', name: 'CashApp' },
    { code: 'aaq', name: 'Netease' },
    { code: 'aft', name: 'Neocrypto' },
    { code: 'zl', name: 'Airtel' },
    { code: 'rm', name: 'Faberlic' },
    { code: 'po', name: 'premium.one' },
    { code: 'ce', name: 'Mosru' },
    { code: 'da', name: 'MTS CashBack' },
    { code: 'wt', name: 'IZI' },
    { code: 'auh', name: 'KeeTa 美团' },
    { code: 'agg', name: 'OneForma' },
    { code: 'abr', name: 'Privy' },
    { code: 'acm', name: 'Razer' },
    { code: 'amz', name: 'ImmoScout24' },
    { code: 'anf', name: 'ZoomInfo' },
    { code: 'ata', name: 'Authy' },
    { code: 'hz', name: 'Drom' },
    { code: 'td', name: 'ChaingeFinance' },
    { code: 'tf', name: 'Noon' },
    { code: 'agy', name: 'Baihe' },
    { code: 'adc', name: 'PlayOJO' },
    { code: 'ny', name: 'Pyro Music' },
    { code: 'jj', name: 'Aitu' },
    { code: 'hc', name: 'MOMO' },
    { code: 'es', name: 'iQIYI' },
    { code: 'aby', name: 'Couponscom' },
    { code: 'avu', name: 'Karos' },
    { code: 'ol', name: 'KazanExpress' },
    { code: 'sb', name: 'Lamoda' },
    { code: 'ys', name: 'ZCity' },
    { code: 'zx', name: 'CommunityGaming' },
    { code: 'iw', name: 'MyLavash' },
    { code: 'zj', name: 'Robinhood Crypto' },
    { code: 'ahl', name: 'Maxim' },
    { code: 'afg', name: 'Zenvia' },
    { code: 'abz', name: 'Friendtech' },
    { code: 'afn', name: 'Roomster' },
    { code: 'ahj', name: 'Strato' },
    { code: 'anq', name: 'Hitnspin' },
    { code: 'arn', name: 'GFK' },
    { code: 'awj', name: 'HyperJar' },
    { code: 'fx', name: 'PGbonus' },
    { code: 'bf', name: 'Keybase' },
    { code: 'cc', name: 'Quipp' },
    { code: 'qi', name: '23red' },
    { code: 'mr', name: 'Fastmail' },
    { code: 'ej', name: 'MrQ' },
    { code: 'mi', name: 'Zupee' },
    { code: 'rh', name: 'Ace2Three' },
    { code: 'lz', name: 'Things' },
    { code: 'asv', name: 'Bilderlings' },
    { code: 'aoe', name: 'Sendwave' },
    { code: 'aom', name: 'Monzo' },
    { code: 'zz', name: 'Dent' },
    { code: 'fy', name: 'Mylove' },
    { code: 'sv', name: 'Dostavista' },
    { code: 'kz', name: 'NimoTV' },
    { code: 'xe', name: 'GalaxyChat' },
    { code: 'en', name: 'Hermes' },
    { code: 'yg', name: 'CourseHero' },
    { code: 'lv', name: 'Megogo' },
    { code: 'lm', name: 'FarPost' },
    { code: 'bm', name: 'MarketGuru' },
    { code: 'dd', name: 'CloudChat' },
    { code: 'adv', name: 'Cian' },
    { code: 'aee', name: 'Amway' },
    { code: 'afo', name: 'KION' },
    { code: 'ard', name: 'Maya' },
    { code: 'awb', name: 'FlixBus' },
    { code: 'bas', name: 'Stoiximan' },
    { code: 'ss', name: 'Hezzl' },
    { code: 'kp', name: 'HQ Trivia' },
    { code: 'de', name: 'Karusel' },
    { code: 'gb', name: 'YouStar' },
    { code: 'sf', name: 'SneakersnStuff' },
    { code: 'kw', name: 'Foody' },
    { code: 've', name: 'Dream11' },
    { code: 'hg', name: 'Switips' },
    { code: 'gz', name: 'LYKA' },
    { code: 'kr', name: 'Eyecon' },
    { code: 'hk', name: '4Fun' },
    { code: 'nn', name: 'Giftcloud' },
    { code: 'gw', name: 'CallApp' },
    { code: 'mk', name: 'LongHu' },
    { code: 'iy', name: 'FoodHub' },
    { code: 'aw', name: 'Taikang' },
    { code: 'vj', name: 'Stormgain' },
    { code: 'cr', name: 'TenChat' },
    { code: 'us', name: 'IRCTC' },
    { code: 'jx', name: 'Swiggy' },
    { code: 'ba', name: 'Expressmoney' },
    { code: 'nw', name: 'Ximalaya' },
    { code: 'kj', name: 'YAPPY' },
    { code: 'ty', name: 'Okey' },
    { code: 'oo', name: 'Liga Pro' },
    { code: 'vs', name: 'WinZO Games' },
    { code: 'wf', name: 'YandexGo' },
    { code: 'wv', name: 'AIS' },
    { code: 'nh', name: 'AlloBank' },
    { code: 'pw', name: 'SellMonitor' },
    { code: 'um', name: 'Belwest' },
    { code: 'vq', name: 'LadyMaria' },
    { code: 'ao', name: 'UU163' },
    { code: 'at', name: 'Perfluence' },
    { code: 'cl', name: 'UWIN' },
    { code: 'wz', name: 'FoxFord' },
    { code: 'uq', name: 'TopDetal' },
    { code: 'dj', name: 'LUKOIL' },
    { code: 'ye', name: 'ZaleyCash' },
    { code: 'vt', name: 'Budget4me' },
    { code: 'xc', name: 'SynotTip' },
    { code: 'xo', name: 'Notifire' },
    { code: 'wy', name: 'Yami' },
    { code: 'wm', name: 'SMO71' },
    { code: 'ahx', name: 'Bitrue' },
    { code: 'acw', name: 'YouDo' },
    { code: 'afj', name: 'SKCAPITAL' },
    { code: 'aap', name: 'Tiptapp' },
    { code: 'adr', name: 'Boosty' },
    { code: 'aed', name: 'Kamatera' },
    { code: 'aat', name: 'TamTam' },
    { code: 'ahv', name: 'Surveybell' },
    { code: 'ain', name: 'SpaceWeb' },
    { code: 'aim', name: 'Smartfren' },
    { code: 'aau', name: 'RockeTreach' },
    { code: 'ach', name: 'Haleon' },
    { code: 'ajg', name: 'Fortumo' },
    { code: 'acd', name: 'CheckDomain' },
    { code: 'aek', name: 'EnerGO' },
    { code: 'agx', name: 'MeiQFashion' },
    { code: 'agu', name: 'Marlboro' },
    { code: 'aif', name: 'Royal Canin' },
    { code: 'abf', name: 'Mercado Pago' },
    { code: 'afl', name: 'Vsesmart' },
    { code: 'afb', name: 'Maybank' },
    { code: 'aex', name: 'Neon' },
    { code: 'ala', name: 'GetResponse' },
    { code: 'ale', name: 'Lydia / Sumeria' },
    { code: 'anp', name: 'Blackcatcard' },
    { code: 'anv', name: 'Claro Pay' },
    { code: 'alz', name: 'CasinoAndFriends' },
    { code: 'api', name: 'KKTIX' },
    { code: 'apt', name: 'Airwallex' },
    { code: 'atp', name: 'Vonage' },
    { code: 'asq', name: 'Warpcast' },
    { code: 'arl', name: 'Myinvestor' },
    { code: 'atl', name: 'Watsons MY' },
    { code: 'avn', name: 'G42' },
    { code: 'aqm', name: 'Tala' },
    { code: 'awq', name: 'Atlas Earth' },
    { code: 'bbf', name: 'Neosurf' },
    { code: 'bbq', name: 'Chime' },
    { code: 'bay', name: 'Genome' },
    { code: 'bfg', name: 'EMAG' },
    { code: 'bfe', name: 'MuchBetter' },
    { code: 'bgj', name: 'MoonPay' },
    { code: 'bgg', name: 'Link.com' },
    { code: 'bhh', name: 'Appen' },
    { code: 'bhz', name: 'Eurobet' },
    { code: 'biz', name: 'BeCharge' },
    { code: 'bjv', name: 'Lotoclub' },
    { code: 'bix', name: 'HOTEL101' },
    { code: 'bod', name: 'Genspark' },
    { code: 'boh', name: 'YoPhone' },
    { code: 'bla', name: 'FDJ PARIONS SPORT' },
    { code: 'bqp', name: 'Zara' },
    { code: 'bqb', name: 'Weex' },
    { code: 'bks', name: 'Heetch' },
    { code: 'brr', name: 'LemFi' }
  ];

  // Rental services (identical to activation services)
  const rentalServices = activationServices;

  // Complete GoGetSMS activation countries (numeric codes) - FULL API documentation list
  const activationCountries: CountryOption[] = [
    { code: '16', name: 'Vereinigtes Königreich' },
    { code: '34', name: 'Estland' },
    { code: '44', name: 'Litauen' },
    { code: '49', name: 'Lettland' },
    { code: '6', name: 'Indonesien' },
    { code: '43', name: 'Deutschland' },
    { code: '56', name: 'Spanien' },
    { code: '77', name: 'Zypern' },
    { code: '4', name: 'Philippinen' },
    { code: '86', name: 'Italien' },
    { code: '45', name: 'Kroatien' },
    { code: '48', name: 'Niederlande' },
    { code: '7', name: 'Malaysia' },
    { code: '15', name: 'Polen' },
    { code: '50', name: 'Österreich' },
    { code: '78', name: 'Frankreich' },
    { code: '52', name: 'Thailand' },
    { code: '172', name: 'Dänemark' },
    { code: '32', name: 'Rumänien' },
    { code: '23', name: 'Irland' },
    { code: '63', name: 'Tschechien' },
    { code: '129', name: 'Griechenland' },
    { code: '163', name: 'Finnland' },
    { code: '117', name: 'Portugal' },
    { code: '39', name: 'Argentinien' },
    { code: '31', name: 'Südafrika' },
    { code: '0', name: 'Russland' },
    { code: '46', name: 'Schweden' },
    { code: '59', name: 'Slowenien' },
    { code: '14', name: 'Hongkong' },
    { code: '1', name: 'Ukraine' },
    { code: '2', name: 'Kasachstan' },
    { code: '73', name: 'Brasilien' },
    { code: '175', name: 'Australien' },
    { code: '187', name: 'Vereinigte Staaten' },
    { code: '128', name: 'Georgien' },
    { code: '67', name: 'Neuseeland' },
    { code: '13', name: 'Israel' },
    { code: '83', name: 'Bulgarien' },
    { code: '196', name: 'Singapur' },
    { code: '24', name: 'Kambodscha' },
    { code: '37', name: 'Marokko' },
    { code: '82', name: 'Belgien' },
    { code: '141', name: 'Slowakei' },
    { code: '201', name: 'Gibraltar' },
    { code: '54', name: 'Mexiko' },
    { code: '33', name: 'Kolumbien' },
    { code: '8', name: 'Kenia' },
    { code: '65', name: 'Peru' },
    { code: '11', name: 'Kirgisistan' },
    { code: '87', name: 'Paraguay' },
    { code: '151', name: 'Chile' },
    { code: '25', name: 'Laos' },
    { code: '108', name: 'Bosnien und Herzegowina' },
    { code: '19', name: 'Nigeria' },
    { code: '174', name: 'Norwegen' },
    { code: '95', name: 'Vereinigte Arabische Emirate' },
    { code: '61', name: 'Senegal' },
    { code: '40', name: 'Usbekistan' },
    { code: '85', name: 'Moldawien' },
    { code: '21', name: 'Ägypten' },
    { code: '66', name: 'Pakistan' },
    { code: '70', name: 'Venezuela' },
    { code: '29', name: 'Serbien' },
    { code: '60', name: 'Bangladesch' },
    { code: '84', name: 'Ungarn' },
    { code: '38', name: 'Ghana' },
    { code: '26', name: 'Haiti' },
    { code: '3', name: 'China' },
    { code: '148', name: 'Armenien' },
    { code: '41', name: 'Kamerun' },
    { code: '109', name: 'Dominikanische Republik' },
    { code: '94', name: 'Guatemala' },
    { code: '143', name: 'Tadschikistan' },
    { code: '64', name: 'Sri Lanka' },
    { code: '5', name: 'Myanmar' },
    { code: '47', name: 'Irak' },
    { code: '51', name: 'Belarus' },
    { code: '171', name: 'Montenegro' },
    { code: '92', name: 'Bolivien' },
    { code: '71', name: 'Äthiopien' },
    { code: '199', name: 'Malta' },
    { code: '183', name: 'Nordmazedonien' },
    { code: '137', name: 'Malawi' },
    { code: '105', name: 'Ecuador' },
    { code: '182', name: 'Japan' }
  ];

  // Rental countries (using 2-letter codes for rental API) - FULL API documentation list
  const rentalCountries: CountryOption[] = [
    { code: 'GB', name: 'Vereinigtes Königreich' },
    { code: 'EE', name: 'Estland' },
    { code: 'LT', name: 'Litauen' },
    { code: 'LV', name: 'Lettland' },
    { code: 'ID', name: 'Indonesien' },
    { code: 'DE', name: 'Deutschland' },
    { code: 'ES', name: 'Spanien' },
    { code: 'CY', name: 'Zypern' },
    { code: 'PH', name: 'Philippinen' },
    { code: 'IT', name: 'Italien' },
    { code: 'HR', name: 'Kroatien' },
    { code: 'NL', name: 'Niederlande' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'PL', name: 'Polen' },
    { code: 'AT', name: 'Österreich' },
    { code: 'FR', name: 'Frankreich' },
    { code: 'TH', name: 'Thailand' },
    { code: 'DK', name: 'Dänemark' },
    { code: 'RO', name: 'Rumänien' },
    { code: 'IE', name: 'Irland' },
    { code: 'CZ', name: 'Tschechien' },
    { code: 'GR', name: 'Griechenland' },
    { code: 'FI', name: 'Finnland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'AR', name: 'Argentinien' },
    { code: 'ZA', name: 'Südafrika' },
    { code: 'RU', name: 'Russland' },
    { code: 'SE', name: 'Schweden' },
    { code: 'SI', name: 'Slowenien' },
    { code: 'HK', name: 'Hongkong' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'KZ', name: 'Kasachstan' },
    { code: 'BR', name: 'Brasilien' },
    { code: 'AU', name: 'Australien' },
    { code: 'US', name: 'Vereinigte Staaten' },
    { code: 'GE', name: 'Georgien' },
    { code: 'NZ', name: 'Neuseeland' },
    { code: 'IL', name: 'Israel' },
    { code: 'BG', name: 'Bulgarien' },
    { code: 'SG', name: 'Singapur' },
    { code: 'KH', name: 'Kambodscha' },
    { code: 'MA', name: 'Marokko' },
    { code: 'BE', name: 'Belgien' },
    { code: 'SK', name: 'Slowakei' },
    { code: 'GI', name: 'Gibraltar' },
    { code: 'MX', name: 'Mexiko' },
    { code: 'CO', name: 'Kolumbien' },
    { code: 'KE', name: 'Kenia' },
    { code: 'PE', name: 'Peru' },
    { code: 'KG', name: 'Kirgisistan' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'CL', name: 'Chile' },
    { code: 'LA', name: 'Laos' },
    { code: 'BA', name: 'Bosnien und Herzegowina' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'NO', name: 'Norwegen' },
    { code: 'AE', name: 'Vereinigte Arabische Emirate' },
    { code: 'SN', name: 'Senegal' },
    { code: 'UZ', name: 'Usbekistan' },
    { code: 'MD', name: 'Moldawien' },
    { code: 'EG', name: 'Ägypten' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'RS', name: 'Serbien' },
    { code: 'BD', name: 'Bangladesch' },
    { code: 'HU', name: 'Ungarn' },
    { code: 'GH', name: 'Ghana' },
    { code: 'HT', name: 'Haiti' },
    { code: 'CN', name: 'China' },
    { code: 'AM', name: 'Armenien' },
    { code: 'CM', name: 'Kamerun' },
    { code: 'DO', name: 'Dominikanische Republik' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'TJ', name: 'Tadschikistan' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'IQ', name: 'Irak' },
    { code: 'BY', name: 'Belarus' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'BO', name: 'Bolivien' },
    { code: 'ET', name: 'Äthiopien' },
    { code: 'MT', name: 'Malta' },
    { code: 'MK', name: 'Nordmazedonien' },
    { code: 'MW', name: 'Malawi' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'JP', name: 'Japan' }
  ];

  // Time options for different modes
  const activationTimeOptions: TimeOption[] = [
    { value: '1', label: 'Bis SMS erhalten (≈5-30 min)' },
    { value: '4', label: '4 Stunden (Backup)' }
  ];

  const rentalTimeOptions: TimeOption[] = [
    { value: '4', label: '4 Stunden' },
    { value: '24', label: '1 Tag (24 Stunden)' },
    { value: '72', label: '3 Tage (72 Stunden)' },
    { value: '168', label: '7 Tage (168 Stunden)' },
    { value: '360', label: '15 Tage (360 Stunden)' },
    { value: '720', label: '30 Tage (720 Stunden)' }
  ];

  const handleModeChange = (newMode: 'activation' | 'rental') => {
    setMode(newMode);
    // Update default country based on mode
    if (newMode === 'activation') {
      setCountry('43'); // Germany numeric code
    } else {
      setCountry('DE'); // Germany 2-letter code
    }
  };

  const handleRent = async () => {
    if (!service || !country || !rentTime) {
      showToast({
        title: 'Fehler',
        message: 'Bitte füllen Sie alle Felder aus',
        type: 'error'
      });
      return;
    }

    try {
      await onRent({
        provider: 'gogetsms',
        service,
        rentTime,
        country,
        mode
      });
      setService('go');
      setCountry(mode === 'activation' ? '43' : 'DE');
      setRentTime('4');
      onClose();
    } catch (error) {
      console.error('Error renting number:', error);
    }
  };

  const colors = {
    primary: '#ee1d3c',
    secondary: '#EF4444'
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="GoGetSMS - Telefonnummer mieten"
      size="lg"
    >
      <div className="space-y-4">
        {/* Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Modus
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleModeChange('activation')}
              className={`p-3 text-sm font-medium rounded-md border-2 transition-colors ${
                mode === 'activation'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="font-semibold">Aktivierung</div>
              <div className="text-xs opacity-75">Eine SMS, günstiger</div>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('rental')}
              className={`p-3 text-sm font-medium rounded-md border-2 transition-colors ${
                mode === 'rental'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="font-semibold">Miete</div>
              <div className="text-xs opacity-75">Mehrere SMS, teurer</div>
            </button>
          </div>
        </div>

        {/* Service Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dienst
          </label>
          <SearchableSelect
            options={mode === 'activation' ? activationServices : rentalServices}
            value={service}
            onChange={setService}
            placeholder="Dienst auswählen..."
            disabled={loading}
          />
        </div>

        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Land
          </label>
          <SearchableSelect
            options={mode === 'activation' ? activationCountries : rentalCountries}
            value={country}
            onChange={setCountry}
            placeholder="Land auswählen..."
            disabled={loading}
          />
        </div>

        {/* Time Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mietdauer
          </label>
          <select
            value={rentTime}
            onChange={(e) => setRentTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            disabled={loading}
          >
            {(mode === 'activation' ? activationTimeOptions : rentalTimeOptions).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleRent}
            disabled={loading}
            style={{ backgroundColor: colors.primary, color: 'white' }}
            className="hover:opacity-90 transition-opacity"
          >
            {loading ? 'Wird gemietet...' : 'Nummer mieten'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default GoGetSmsModal;