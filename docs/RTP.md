# RealTime Protocol

## Packet Format

#### RealTime Control Protocol (RTCP)

<table border="1">
  <tr>
    <th>00</th>
    <th>01</th>
    <th>02</th>
    <th>03</th>
    <th>04</th>
    <th>05</th>
    <th>06</th>
    <th>07</th>
    <th>08</th>
    <th>09</th>
    <th>10</th>
    <th>11</th>
    <th>12</th>
    <th>13</th>
    <th>14</th>
    <th>15</th>
    <th>16</th>
    <th>17</th>
    <th>18</th>
    <th>19</th>
    <th>20</th>
    <th>21</th>
    <th>22</th>
    <th>23</th>
    <th>24</th>
    <th>25</th>
    <th>26</th>
    <th>27</th>
    <th>28</th>
    <th>29</th>
    <th>30</th>
    <th>31</th>
  </tr>
  <tr>
    <td colspan="2">Version</td>
    <td>P</td>
    <td colspan="5">Count</td>
    <td colspan="8">Type</td>
    <td colspan="16">Length</td>
  </tr>
  <tr>
    <td colspan="32">Data</td>
  </tr>
</table>

#### RealTime Procotol (RTP)

<table border="1">
  <tr>
    <th>00</th>
    <th>01</th>
    <th>02</th>
    <th>03</th>
    <th>04</th>
    <th>05</th>
    <th>06</th>
    <th>07</th>
    <th>08</th>
    <th>09</th>
    <th>10</th>
    <th>11</th>
    <th>12</th>
    <th>13</th>
    <th>14</th>
    <th>15</th>
    <th>16</th>
    <th>17</th>
    <th>18</th>
    <th>19</th>
    <th>20</th>
    <th>21</th>
    <th>22</th>
    <th>23</th>
    <th>24</th>
    <th>25</th>
    <th>26</th>
    <th>27</th>
    <th>28</th>
    <th>29</th>
    <th>30</th>
    <th>31</th>
  </tr>
  <tr>
    <td colspan="2">Version</td>
    <td>P</td>
    <td>X</td>
    <td colspan="4">CSRC Count</td>
    <td>Marker</td>
    <td colspan="7">Payload Type</td>
    <td colspan="16">Sequence Number</td>
  </tr>
  <tr>
    <td colspan="32">Timestamp</td>
  </tr>
  <tr>
    <td colspan="32">Synchronization Source (SSRC)</td>
  </tr>
  <tr>
    <td colspan="32">Contributing Source (CSRC) [0..15]</td>
  </tr>
</table>
