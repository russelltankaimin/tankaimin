# -*- coding: utf-8 -*-
"""
Every positive integer is a sum of three palindromes.

Created on Mon Dec 23 21:16:40 2019
@author: RussellTan ; with some help from GeeksForGeeks for base_convert function help

An implementation of the algorithm of Cilleruelo, Luca and Baxter,
"Every positive integer is a sum of three palindromes" (Math. Comp. 2018,
arXiv:1602.06208), which works in any base g >= 5.

Numbers are lists of digits, most significant first: in base 16,
[13, 14, 10, 13] is DEAD.

Use it from Python:

    >>> solve(10, "2019")["palindromes"]
    ['2002', '11', '6']

or run this file for an interactive console (or `python3 sumof3palindromes.py test`
to check a range of numbers).
"""
import time

# Digits for bases up to 36: 0-9 then A-Z
DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
MIN_BASE, MAX_BASE = 5, 36

# What the last run did: the type of the number (A1-A6, B1-B7) and the
# algorithms (I-V) it went through. Filled in by _note() and read by solve().
_trace = {"type": None, "algorithms": []}

def _note(kind, value):
    if kind == "type":
        if _trace["type"] is None:     # keep the type of the number itself, not of n' in Algorithm V
            _trace["type"] = value
    else:
        _trace["algorithms"].append(value)

def base_convert(inputNum,base):
    # inputNum as a string of digits in the given base
    res=''
    while inputNum > 0:
        res += DIGITS[inputNum % base]
        inputNum //= base
    return res[::-1]

def one_digit_sum(num,base):
    return [num,[0],[0]]       
def two_digit_sum(num,base):
    num=num[::-1]
    if num[1]<=num[0]:
        p1=[num[1],num[1]]
        p2=[num[0]-num[1]]
        p3=[0]
    elif num[1]>num[0]+1:
        p1=[num[1]-1,num[1]-1]
        p2=[base+num[0]-num[1]+1]
        p3=[0]
    elif num[1]==num[0]+1:
        if num[0]==0:
            p1=[base-1]
            p2=[1]
            p3=[0]
        else:
            p1=[num[0],num[0]]
            p2=[base-1]
            p3=[1]
    return [p1,p2,p3]
    
def three_digit_sum(num,base):
    num=num[::-1]
    if num[2]<=num[0]:
        p1=[num[2],num[1],num[2]]
        p2=[num[0]-num[2]]
        p3=[0]
    elif num[2]>=num[0]+1:
        if num[1]!=0:
            p1=[num[2],num[1]-1,num[2]]
            p2=[base+num[0]-num[2]]
            p3=[0]
        else:
            if d(num[2]-num[0]-1,base)!=0:
                p1=[num[2]-1,base-1,num[2]-1]
                p2=[base+num[0]-num[2]+1]
                p3=[0]
            else:
                if num[2]>=3:
                    p1=[num[2]-2,base-1,num[2]-2]
                    p2=[1,1,1]
                    p3=[0]
                elif num[2]==2:
                    p1=[1,0,1]
                    p2=[base-1,base-1]
                    p3=[1]
                else:
                    p1=[base-1,base-1]
                    p2=[1]
                    p3=[0]
    return [p1,p2,p3]

def four_digit_sum(num,base):
    perm=num
    [d0,d1,d2,d3]=num[::-1]
    n=perm[0]*(base**3)+perm[1]*(base**2)+perm[2]*base+perm[3]
    if n>=d3*(base**3)+d3:
        m=n-d3*(base**3)-d3
        dp=d(m,base)
        if m==2*(base**2)+1:
            if d3==1:
                return[[1,1,1,1],[base-2,base-2],[3]]
            elif d3==base-1:
                return [[base-1,1,1,base-1],[base-2,base-2],[3]]
            else:
                return [[d3-1,base-1,base-1,d3-1],[2,1,2],[0]]
        elif (1<=dp<=base-2 and m==(dp+1)*base+dp):
            if(d3+dp==d0):
                if d3!=1:
                    return [[d3-1,base-2,base-2,d3-1],[1,3,1],[dp,dp]]
                else:
                    return [[base-1,base-1,base-1],[dp+1,dp+1],[1]]
            else:
                return [[d3-1,base-2,base-2,d3-1],[1,3,1],[dp,dp]]
        elif d2==0 and d1==0 and d0<=d3-1 and d3!=1:
            return [[d3-1,base-1,base-1,d3-1],[base+d0-d3],[1]]
        elif [d0,d1,d2,d3]==[0,0,0,1]:
            return [[base-1,base-1,base-1],[1],[0]]
        else:
            m=base_convert(m,base)
            m=hex_int_to_lst(m)
            if len(m)==1:
                extra=one_digit_sum(m,base)
            elif len(m)==2:
                extra=two_digit_sum(m,base)
            elif len(m)==3:
                extra=three_digit_sum(m,base)
            else:
                extra=four_digit_sum(m,base)
            config=[[d3,0,0,d3]]
            config.append(extra[0])
            config.append(extra[1])
            return config
    elif d0<=d3-1 and d3!=1:
        return [[d3-1,base-1,base-1,d3-1],[base+d0-d3],[1]]
    else:
        return [[base-1,base-1,base-1],[1],[0]]
    
def five_digit_sum(num,base):
    #perm=num #perm is the number the shallow copy of the actual number
    if num[0]!=1:
        [types,config,special]=check_type(num,base)
        return algorithm_1(num,config,base,types)
    else:
        [d0,d1,d2,d3,d4]=num[::-1]
        i1=1*(base**4 + 1)+ d3*(base+base**3) #1d30d31
        deci_num=d0+d1*base+d2*(base**2)+d3*(base**3)+d4*(base**4)
        m=deci_num-i1
        dp=d(m,base)
        i2=1*(base**4 + 1)+ (d3-1)*(base+base**3)+(base-1)*(base**2)
        m2=deci_num-i2
        dpp=d(m2,base)
        tho=2*(base**2)+1
        if (deci_num>=i1 and m!=tho) and (dp==0 or dp==base-1 or m!=(dp+1)*base+dp):
            m=base_convert(m,base)
            m=hex_int_to_lst(m)
            if len(m)==1:
                extra=one_digit_sum(m,base)
            elif len(m)==2:
                extra=two_digit_sum(m,base)
            elif len(m)==3:
                extra=three_digit_sum(m,base)
            elif len(m)==4:
                extra=four_digit_sum(m,base)
            else:
                extra=five_digit_sum(m,base)
            config1=[[1,d3,0,d3,1]]
            config1.append(extra[0])
            config1.append(extra[1])
            return config1
        elif deci_num>=i1 and m==tho:
            return [[1,d3,1,d3,1],[1,0,1]]
        elif deci_num>=i1 and m==(dp+1)*base+dp and 1<=dp<=base-2 and d3!=0:
            if dp+1+d3<=base-1:
                return [[1,d3-1,1,d3-1,1],[base-1,dp+1,base-1],[dp+1]]
            elif d3+1+dp==base+d1:
                return [[1,d3-1,1,d3-1,1],[base-1,dp+1,base-1],[dp+1]]
        elif deci_num>=i1 and m==(dp+1)*base+dp and 1<=dp<=base-2 and d3==0:
            return [[base-1,base-1,base-1,base-1],[dp+1,dp+1],[1]]
        elif deci_num<i1 and d3==0:
            return [[base-1]*4,[1],[0]]
        elif (deci_num<i1 and d3!=0 and m2!=tho) and (dp==0 or dp==base-1 or m2!=(dpp+1)*base+dpp):
            m=base_convert(m2,base)
            m=hex_int_to_lst(m)
            if len(m)==1:
                extra=one_digit_sum(m,base)
            elif len(m)==2:
                extra=two_digit_sum(m,base)
            elif len(m)==3:
                extra=three_digit_sum(m,base)
            elif len(m)==4:
                extra=four_digit_sum(m,base)
            else:
                extra=five_digit_sum(m,base)
            config1=[[1,d3-1,base-1,d3-1,1]]
            config1.append(extra[0])
            config1.append(extra[1])
            return config1
        else:
            return [[1,d3-1,base-2,d3-1,1],[1,dp+1,1],[dp-1]]
    
def six_digit_sum(num,base):
    [d0,d1,d2,d3,d4,d5]=num[::-1]
    if d5!=1:
        num=num[::-1]
        length=6
        m=3
        [types,config,special]=check_type([d5,d4,d3,d2,d1,d0],base)
        c=[0]
        x,y,z=[0]+config[0],[0]+config[1],[0]+config[2]
        c.append((x[1]+y[1]+z[1])//base)
        x.append(d(num[2*m-2]-y[1],base) if z[1]<=num[2*m-3]-1 else d(num[2*m-2]-y[1]-1,base))
        y.append(d(num[2*m-3]-z[1]-1,base))
        z.append(d(num[1]-x[2]-y[2]-c[1],base))
        c.append((x[2]+y[2]+z[2]+c[1]-num[1])//base)
        for i in range(3,m):
            x.append(1 if z[i-1]<=num[2*m-i-1]-1 else 0)
            y.append(d(num[2*m-i-1]-z[i-1]-1,base))
            z.append(d(num[i-1]-x[i]-y[i]-c[i-1],base))
            c.append((x[i]+y[i]+z[i]+c[i-1]-num[i-1])//base)
        x.append(0)
        y.append(d(num[m-1]-z[m-1]-c[m-1],base))
        c.append((x[m]+y[m]+z[m-1]+c[m-1]-num[m-1])//base)
        if c[m]==1:
            return [[x[1],x[2],x[3],x[3],x[2],x[1]],[y[1],y[2],y[3],y[2],y[1]],[z[1],z[2],z[2],z[1]]]
        elif c[m]==0:
            if y[m]!=0:
                x[m]=1
                y[m]-=1
                return [[x[1],x[2],x[3],x[3],x[2],x[1]],[y[1],y[2],y[3],y[2],y[1]],[z[1],z[2],z[2],z[1]]]
            else:
                if y[m-1]!=0:
                    x[m]=1
                    y[m]=base-2
                    y[m-1]-=1
                    z[m-1]+=1
                    return [[x[1],x[2],x[3],x[3],x[2],x[1]],[y[1],y[2],y[3],y[2],y[1]],[z[1],z[2],z[2],z[1]]]
                else:
                    if z[m-1]!=0:
                        y[m]=1
                        y[m-1]=1
                        z[m-1]-=1
                        return [[x[1],x[2],x[3],x[3],x[2],x[1]],[y[1],y[2],y[3],y[2],y[1]],[z[1],z[2],z[2],z[1]]]
                    else:
                        if x[2]!=0:
                            x[2]-=1
                            x[3]=base-1
                            y[2]=1
                            y[3]=1
                            return [[x[1],x[2],x[3],x[3],x[2],x[1]],[y[1],y[2],y[3],y[2],y[1]],[z[1],z[2],z[2],z[1]]]
                        elif x[1]==1:
                            return [[2,0,0,0,0,2],[1,1],[base-4]]
                        elif x[1]!=1 and y[1]!=base-1:
                            return [[x[1]-1,base-1,0,0,base-1,x[1]-1],[y[1]+1,0,base-2,0,y[1]+1],[z[1],1,1,z[1]]]
                        elif x[1]!=base-1 and z[1]==base-1 and y[1]==base-1:
                            return [[x[1]+1,0,0,0,0,x[1]+1],[1,1],[base-4]]
        elif c[m]==2:
            x[m]=1
            y[m-1]-=1
            y[m]=base-2
            z[m-1]=0
            return [[x[1],x[2],x[3],x[3],x[2],x[1]],[y[1],y[2],y[3],y[2],y[1]],[z[1],z[2],z[2],z[1]]]
    else:
        x,y,z=[0],[0],[0]
        c=[0]
        if d(d0-d4+1,base)!=0 and d(d0-d4+2,base)!=0:
            x.append((base+d4-1)//2)
            y.append(base+d4-1-x[1])
            z.append(d(d0-d4+1,base))
            c.append((x[1]+y[1]+z[1]-d0)//base)
            x.append((base+d3-1)//2)
            y.append(base+d3-1-x[2])
            z.append(d(d1-x[2]-y[2]-c[1],base))
            c.append((x[2]+y[2]+z[2]+c[1]-d1)//base)
            x.append((base+d2-c[2]-z[1])//2)
            y.append(base+d2-c[2]-z[1]-x[3])
            return [[x[1],x[2],x[3],x[2],x[1]],[y[1],y[2],y[3],y[2],y[1]],[z[1],z[2],z[1]]]
        elif d(d0-d4+2,base)==0 and d2!=0:
            x.append((base+d4-1)//2)
            y.append(base+d4-1-x[1])
            z.append(base-1)
            c.append((x[1]+y[1]+z[1]-d0)//base)
            x.append((base+d3-1)//2)
            y.append(base+d3-1-x[2])
            z.append(d(d1-x[2]-y[2]-c[1],base))
            c.append((x[2]+y[2]+z[2]+c[1]-d1)//base)
            x.append((1+d2-c[2])//2)
            y.append(1+d2-c[2]-x[3])
            return [[x[1],x[2],x[3],x[2],x[1]],[y[1],y[2],y[3],y[2],y[1]],[z[1],z[2],z[1]]]
        elif d(d0-d4+2,base)==0 and d2==0:
            x.append(0)
            y.append(0)
            z.append(0)
            if d4==0:
                x2=d3//2
                y2=d3-x2
                z2=d(d1-x2-y2-1,base)
                c2=(x2+y2+z2+1-d1)//base
                x3=(base-c2-z2)//2
                y3=base-c2-z2-x3
                return [[base-2,x2,x3,x2,base-2],[1,y2,y3,y2,1],[base-1,z2,z2,base-1]]
            elif d4==1:
                x2=(d3//2)
                y2=(d3-x2)
                z2=d(d1-x2-y2-1,base)
                c2=(x2+y2+z2+1-d1)//base
                x3=(base-c2-z2)//2
                y3=base-c2-z2-x3
                return [[base-1,x2,x3,x2,base-1],[1,y2,y3,y2,1],[base-1,z2,z2,base-1]]
            elif d4==2:
                x2=d3//2
                y2=d3-x2
                z2=d(d1-x2-y2-2,base)
                c2=(x2+y2+z2+2-d1)//base
                if c2!=2:
                    x3=(base-c2-z2)//2
                    y3=base-c2-z2-x3
                    return [[base-1,x2,x3,x2,base-1],[2,y2,y3,y2,2],[base-1,z2,z2,base-1]]
                else:
                    return [[1,2,base-2,base-2,2,1],[1,base-3,1],[base-2]]
            elif d4>=3:
                c4=(d(d3-1,base)+1-d3)//base
                z1=d(d1-d3-1+c4,base)
                c2=(2-c4+d(d3-1,base)+z1-d1)//base
                return [[1,1-c4,0,0,1-c4,1],[d4-1,d(d3-1,base),2-c2,d(d3-1,base),d4-1],[base-2,z1,base-2]]
        elif d(d0-d4+1,base)==0 and d3!=0:
            if d4!=base-1:
                x1=(base+d4)//2
                y1=base+d4-x1
                z1=base-1
                c1=(x1+y1+z1-d0)//base
                x2=(d3-1)//2
                y2=d3-1-x2
                z2=d(d1-x2-y2-c1,base)
                c2=(x2+y2+z2+c1-d1)//base
                x3=(1+d2-c2)//2
                y3=1+d2-c2-x3
                return [[x1,x2,x3,x2,x1],[y1,y2,y3,y2,y1],[z1,z2,z1]]
            else:
                if d(d1-4,base)==base-1:
                    yd=3
                elif d(d1-4,base)==base-2:
                    yd=2
                else:
                    yd=1
                xd=d3+base-yd if d3<yd else d3-yd
                c1=(3+yd +d(d1-3-yd,base)-d1)//base
                mu=0
                c2=(xd+d(d2-xd-1-c1+mu,base)+c1+1-d2)//base
                if c2<=1:
                    pass
                else:
                    c2=1
                    mu=1
                c3=(xd+yd-d3)//base
                return [[1,3-c3,xd-mu,xd-mu,3-c3,1],[base-4,yd-c2+mu,d(d2-xd-1-c1+mu,base),yd-c2+mu,base-4],[1,d(d1-3-yd,base)+c2-mu+c3,1]]
        elif d(d0-d4+1,base)==0 and d3==0:
            if d4==0:
                if d2!=0:
                    n=d0+d1*base+d2*(base**2)+d3*(base**3)+d4*(base**4)+d5*(base**5)
                    s=n-1-base**5
                    m=base_convert(s,base)
                    m=hex_int_to_lst(m)
                    if len(m)==1:
                        extra=one_digit_sum(m,base)
                    elif len(m)==2:
                        extra=two_digit_sum(m,base)
                    elif len(m)==3:
                        extra=three_digit_sum(m,base)
                    elif len(m)==4:
                        extra=four_digit_sum(m,base)
                    elif len(m)==5:
                        extra=five_digit_sum(m,base)
                    else:
                        extra=six_digit_sum(m,base)
                    config1=[[1,0,0,0,0,1]]
                    config1.append(extra[0])
                    config1.append(extra[1])
                    return config1
                elif d1!=0 and d1!=base-1:
                    n=d0+d1*base+d2*(base**2)+d3*(base**3)+d4*(base**4)+d5*(base**5)
                    s=n-1-base**5
                    m=base_convert(s,base)
                    m=hex_int_to_lst(m)
                    if len(m)==1:
                        extra=one_digit_sum(m,base)
                    elif len(m)==2:
                        extra=two_digit_sum(m,base)
                    elif len(m)==3:
                        extra=three_digit_sum(m,base)
                    elif len(m)==4:
                        extra=four_digit_sum(m,base)
                    elif len(m)==5:
                        extra=five_digit_sum(m,base)
                    else:
                        extra=six_digit_sum(m,base)
                    config1=[[1,0,0,0,0,1]]
                    config1.append(extra[0])
                    config1.append(extra[1])
                    return config1
                elif d1==0:
                    return [[1,0,0,0,0,1],[base-2],[0]]
                elif d1==base-1:
                    return [[base-1,0,1,0,base-1],[base-1,base-2,base-2,base-1],[1,0,1]]
            elif d4==1:
                if d2>=2 or (d2==1 and d1>=2):
                    n=d0+d1*base+d2*(base**2)+d3*(base**3)+d4*(base**4)+d5*(base**5)
                    s=n-1-base-base**4-base**5
                    m=base_convert(s,base)
                    m=hex_int_to_lst(m)
                    if len(m)==1:
                        extra=one_digit_sum(m,base)
                    elif len(m)==2:
                        extra=two_digit_sum(m,base)
                    elif len(m)==3:
                        extra=three_digit_sum(m,base)
                    elif len(m)==4:
                        extra=four_digit_sum(m,base)
                    elif len(m)==5:
                        extra=five_digit_sum(m,base)
                    else:
                        extra=six_digit_sum(m,base)
                    config1=[[1,1,0,0,1,1]]
                    config1.append(extra[0])
                    config1.append(extra[1])
                    return config1
                elif d2==1 and d1==0:
                    return [[1,0,base-1,base-1,0,1],[1,base-1,1],[base-2]]
                elif d2==1 and d1==1:
                    return [[1,1,0,0,1,1],[base-1,base-1],[0]]
                elif d2==0 and d1>=2:
                    return [[1,1,0,0,1,1],[d1-2,d1-2],[base-d1+1]]
                elif d2==0 and d1==1:
                    return [[1,0,0,0,0,1],[1,0,0,0,1],[base-2]]
                elif d2==0 and d1==0:
                    return [[1,0,0,0,0,1],[base-1,base-1,base-1,base-1],[0]]
            elif d4==2:
                if d2>=2 or (d2==1 and d1>=2):
                    n=d0+d1*base+d2*(base**2)+d3*(base**3)+d4*(base**4)+d5*(base**5)
                    s=n-1-2*base-2*(base**4)-base**5
                    m=base_convert(s,base)
                    m=hex_int_to_lst(m)
                    if len(m)==1:
                        extra=one_digit_sum(m,base)
                    elif len(m)==2:
                        extra=two_digit_sum(m,base)
                    elif len(m)==3:
                        extra=three_digit_sum(m,base)
                    elif len(m)==4:
                        extra=four_digit_sum(m,base)
                    elif len(m)==5:
                        extra=five_digit_sum(m,base)
                    else:
                        extra=six_digit_sum(m,base)
                    config1=[[1,2,0,0,2,1]]
                    config1.append(extra[0])
                    config1.append(extra[1])
                    return config1
                elif d2==1 and d1==0:
                    return [[1,1,base-1,base-1,1,1],[1,base-2,1],[base-1]]
                elif d2==1 and d1==1:
                    return [[1,1,base-1,base-1,1,1],[1,base-1,1],[base-1]]
                elif d2==0 and d1==3:
                    return [[1,2,0,0,2,1],[base-1],[1]]
                elif d2==0 and d1>3:
                    return [[1,2,0,0,2,1],[d1-3,d1-3],[base-d1+3]]
                elif d2==0 and d1==2:
                    return [[1,1,base-1,base-1,1,1],[1,0,1],[base-1]]
                elif d2==0 and d1==1:
                    return [[1,0,0,0,0,1],[2,0,0,0,2],[base-2]]
                elif d2==0 and d1==0:
                    return [[1,1,base-1,base-1,1,1],[base-2,base-2],[2]]
            elif d4==3:
                if d(d1-2,base)==0:
                    yd=3
                elif d(d1-2,base)==base-1:
                    yd=2
                else:
                    yd=1
                c1=(2+yd+d(d1-1-yd,base)-d1)//base
                c2=(base-yd-1+d(d2+yd+2,base)+base-1-d2)//base
                return [[1,0,base-yd-1-c1,base-yd-1-c1,0,1],[2,yd-c2+1+c1,d(d2+yd+2,base),yd-c2+1+c1,2],[base-1,d(d1-1-yd,base)+c2-1-c1,base-1]]
            elif d4>=4:
                if d(d1-2,base)==0:
                    yd=3
                elif d(d1-2,base)==base-1:
                    yd=2
                else:
                    yd=1
                c1=(1+yd+d(d1-yd-1,base)-d1)//base
                c2=(base-yd+1+d(d2+yd-1,base)-d2)//base
                return [[1,2,base-yd-c1,base-yd-c1,2,1],[d4-3,yd-c2+c1,d(d2+yd-1,base),yd-c2+c1,d4-3],[1,d(d1-2-yd,base)+c2-c1,1]]
                    
                    

def debug(message):
    pass

def main_algorithm(number,base):
    length=len(number)
    odd=(length%2!=0)
    [types,config,special]=check_type(number,base)
    #state is another word for type
    if length>=7:
        if types=="A1" or types=="A2" or types=="A3" or types=="A4":
            if odd:
                res=algorithm_1(number,config,base,types)
            elif not special:
                res=algorithm_2(number,config,base,types)
            else:
                res=algorithm_5(number,config,base)
        elif types=="A5" or types=="A6":
            if not odd:
                res=algorithm_1(number,config,base,types)
            elif not special:
                res=algorithm_2(number,config,base,types)
            else:
                res=algorithm_5(number,config,base)
        elif types=="B1" or types=="B2" or types=="B3" or types=="B4" or types=="B5" or types=="B6" or types=="B7":
            if odd:
                res=algorithm_3(number,config,base)
            elif not special:
                res=algorithm_4(number,config,base)
            else:
                res=algorithm_5(number,config,base)
    return res
    
                
def big_sub(digits,s,base):
    #digits in [13,12,1,1,0,2,4]
    #s in [1,1,0,0,0,0,]
    for i in range(0,len(digits)):
        digits[i]-=(s[i] | 0)
        while digits[i]<0:
            digits[i]+=base
            digits[i+1]-=1
    while len(digits)==0 and digits[len(digits)-1]==0:
        digits.pop()
    return digits
    
def check_type(number,base):
    num=number
    l=len(number)
    m=l>>1
    test_num=num[::-1]
    special=(test_num[m]==0 or test_num[m-1]==0)
    #number is not inverted, but in proper position
    if d(int(num[-1])-int(num[0])-int(num[1])+1,base) != 0 and ( int(num[1])!=0 and int(num[1])!=1 and int(num[1])!=2):
        _note("type", "A1")
        types="A1"
        p1=[int(num[0])] #Palindrome 1
        p2=[int(num[1])-1] #Palindrome 2
        p3=[d(int(num[-1])-int(num[0])-int(num[1])+1,base)]#Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif d(int(num[-1])-int(num[0])-int(num[1])+1,base)==0 and (int(num[1])!=0 and int(num[1])!=1 and int(num[1])!=2):
        _note("type", "A2")
        types="A2"
        p1=[int(num[0])] #Palindrome 1
        p2=[int(num[1])-2] #Palindrome 2
        p3=[1] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif d(int(num[-1])-int(num[0])+2,base)!=0 and (int(num[1])==0 or int(num[1])==1 or int(num[1])==2) and int(num[0])!=1:
        _note("type", "A3")
        types="A3"
        p1=[int(num[0])-1] #Palindrome 1
        p2=[base-1] #Palindrome 2
        p3=[d(int(num[-1])-int(num[0])+2,base)] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif d(int(num[-1])-int(num[0])+2,base)==0 and (int(num[1])==0 or int(num[1])==1 or int(num[1])==2) and int(num[0])!=1:
        _note("type", "A4")
        types="A4"
        p1=[int(num[0])-1] #Palindrome 1
        p2=[base-2] #Palindrome 2
        p3=[1] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif d(int(num[-1])-int(num[2]),base)!=0 and int(num[2])<=3 and int(num[1])==0 and int(num[0])==1:
        _note("type", "A5")
        types="A5"
        p1=[base-1] #Palindrome 1
        p2=[int(num[2])+1] #Palindrome 2
        p3=[d(int(num[-1])-int(num[2]),base)] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==1))
        return [types,config,special]
    elif d(int(num[-1])-int(num[2]),base) ==0 and int(num[2])<=2 and int(num[1])==0 and int(num[0])==1:
        _note("type", "A6")
        types="A6"
        p1=[base-1] #Palindrome 1
        p2=[int(num[2])+2] #Palindrome 2
        p3=[base-1] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==1))
        return [types,config,special]
    elif d(int(num[-1])-int(num[2]),base)!=0 and int(num[2])>=4 and int(num[1])<=2 and int(num[0])==1:
        _note("type", "B1")
        types="B1"
        p1=[1,int(num[1])] #Palindrome 1
        p2=[int(num[2])-1] #Palindrome 2
        p3=[d(int(num[-1])-int(num[2]),base)] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif d(int(num[-1])-int(num[2]),base)==0 and int(num[2])>=3 and int(num[1])<=2 and int(num[0])==1:
        _note("type", "B2")
        types="B2"
        p1=[1,int(num[1])] #Palindrome 1
        p2=[int(num[2])-2] #Palindrome 2
        p3=[1] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif int(num[-1])==0 and (int(num[2])==0 or int(num[2])==1 ) and (int(num[1])==2 or int(num[1])==1 ) and int(num[0])==1:
        _note("type", "B3")
        types="B3"
        p1=[1,int(num[1])-1] #Palindrome 1
        p2=[base-2] #Palindrome 2
        p3=[1] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif int(num[-1])==0 and (int(num[2])==2 or int(num[2])==3 ) and (int(num[1])==2 or int(num[1])==1 ) and int(num[0])==1: 
        _note("type", "B4")
        types="B4"
        p1=[1,int(num[1])] #Palindrome 1
        p2=[1] #Palindrome 2
        p3=[base-2] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif int(num[-1])!=0 and (int(num[2])==0 or int(num[2])==1 or int(num[2])==2) and (int(num[1])==1 or int(num[1])==2) and int(num[0])==1:
        _note("type", "B5")
        types="B5"
        p1=[1,int(num[1])-1] #Palindrome 1
        p2=[base-1] #Palindrome 2
        p3=[int(num[-1])] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif d(int(num[-1])-3,base)!= 0 and int(num[2])==3 and (int(num[1])==1 or int(num[1])==2) and int(num[0])==1:
        _note("type", "B6")
        types="B6"
        p1=[1,int(num[1])] #Palindrome 1
        p2=[2] #Palindrome 2
        p3=[d(int(num[-1])-3,base)] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    elif int(num[-1])==3 and int(num[2])==3 and (int(num[1])==1 or int(num[1])==2) and int(num[0])==1:
        _note("type", "B7")
        types="B7"
        p1=[1,int(num[1])] #Palindrome 1
        p2=[1] #Palindrome 2
        p3=[1] #Palindrome 3
        config=[p1,p2,p3]
        special=(special and (l%2==0))
        return [types,config,special]
    else:
        types=None
        return [types,0,False]

def d(num,base):
    return num%base

def hex_int_to_lst(num):
    # '1F3' -> [1, 15, 3]; digits are 0-9 then A-Z
    return [DIGITS.index(ch) for ch in str(num).upper()]

def lst_to_hex_int(num_list):#input=[10,13,14,0,0,0,12,5];output=ADE000C5
    return "".join(DIGITS[int(x)] for x in num_list)

def algorithm_1(number,config,base,types):
    _note("algorithm", "I")
    if types=="A5" or types=="A6":
        number=number[1:]
    else:
        pass
    rev_num=number[::-1]
    num=number
    length=len(num)
    m=length>>1
    x,y,z=config[0],config[1],config[2]
    x=[0]+x
    y=[0]+y
    z=[0]+z
    c=[0,(x[1]+y[1]+z[1])//base]
    x.append(d(rev_num[2*m-1]-y[1],base) if z[1]<=(rev_num[2*m-2]-1) else d(rev_num[2*m-1]-y[1]-1,base))
    y.append(d(rev_num[2*m-2]-z[1]-1,base))
    z.append(d(rev_num[1]-x[2]-y[2]-c[1],base))
    c.append((x[2]+y[2]+z[2]+c[1]-rev_num[1])//base)
    for i in range(3,m+1):
        x.append(1 if z[i-1]<=rev_num[2*m-i]-1 else 0)
        y.append(d(rev_num[2*m-i]-z[i-1]-1,base))
        z.append(d(rev_num[i-1]-x[i]-y[i]-c[i-1],base))
        c.append((x[i]+y[i]+z[i]+c[i-1]-rev_num[i-1])//base)
    x.append(0)
    if c[m]==1:
        debug("No Adjustment needed")
        pass
    elif c[m]==0:
        debug("c[m]=0")
        x[m+1]=1
    elif c[m]==2:
        debug("c[m]=2")
        if z[m]!= base - 1:
            y[m]-=1
            z[m]+=1
        else:
            x[m+1]=1
            y[m]-=1
            z[m]=0
    x=x[1:]
    y=y[1:]
    z=z[1:]
    y=y+y[::-1]
    t_x=x[::-1]
    x=x+t_x[1:]
    t_z=z[::-1]
    z=z+t_z[1:]
    config=[x,y,z]
    return config

def algorithm_2(number,config,base,types):
    _note("algorithm", "II")
    if types=="A5" or types=="A6":
        number=number[1:]
    else:
        pass
    num=number[::-1]
    length=len(num)
    m=length>>1
    x,y,z=config[0],config[1],config[2]
    x=[0]+x
    y=[0]+y
    z=[0]+z
    c=[0,(x[1]+y[1]+z[1])//base]
    x.append(d(num[2*m-2]-y[1],base) if z[1]<=num[2*m-3]-1 else d(num[2*m-2]-y[1]-1,base))
    y.append(d(num[2*m-3]-z[1]-1,base))
    z.append(d(num[1]-x[2]-y[2]-c[1],base))
    c.append((x[2]+y[2]+z[2]+c[1]-num[1])//base)
    for i in range(3,m):
        x.append(1 if z[i-1]<=num[2*m-i-1]-1 else 0)
        y.append(d(num[2*m-i-1]-z[i-1]-1,base))
        z.append(d(num[i-1]-x[i]-y[i]-c[i-1],base))
        c.append((x[i]+y[i]+z[i]+c[i-1]-num[i-1])//base)
    x.append(0)
    y.append(d(num[m-1]-z[m-1]-c[m-1],base))
    c.append((x[m]+y[m]+z[m-1]+c[m-1]-num[m-1])//base)
    if c[m]==1:
        pass
    elif c[m]==0:
        if y[m]!=0:
            x[m]=1
            y[m]-=1
        else:
            if y[m-1]!=0:
                x[m]=1
                y[m]=base-2
                y[m-1]-=1
                z[m-1]+=1
            elif y[m-1]==0 and z[m-1]!=0:
                y[m]=1
                y[m-1]=1
                z[m-1]-=1
            elif y[m-1]==0 and z[m-1]==0:
                x[m-1]-=1
                x[m]=1
                y[m]=base-4
                y[m-1]=base-1
                z[m-1]=2
    elif c[m]==2:
        x[m]=1
        y[m-1]-=1
        y[m]=base-2
        z[m-1]=0
    x,y,z=x[1:],y[1:],z[1:]
    x,z=x+x[::-1],z+z[::-1]
    t_y=y[::-1]
    y=y+t_y[1:]
    config=[x,y,z]
    return config

def algorithm_3(number,config,base):
    _note("algorithm", "III")
    num=number[::-1]
    x,y,z=config[0],config[1],config[2]
    length=len(num)
    m=length>>1
    y=[0]+y
    z=[0]+z
    c=[0,(1+y[1]+z[1])//base]
    x.append(d(num[2*m-2]-y[1],base) if z[1]<= num[2*m-3]-1 else d(num[2*m-2]-y[1]-1,base))
    y.append(d(num[2*m-3]-z[1]-1,base))
    z.append(d(num[1]-x[1]-y[2]-c[1],base))
    c.append((x[1]+y[2]+z[2]+c[1]-num[1])//base)
    for i in range(3,m):
        x.append(1 if z[i-1]<=num[2*m-i-1]-1 else 0)
        y.append(d(num[2*m-i-1]-z[i-1]-1,base))
        z.append(d(num[i-1]-x[i-1]-y[i]-c[i-1],base))
        c.append((x[i-1]+y[i]+z[i]+c[i-1]-num[i-1])//base)
    x.append(0)
    y.append(d(num[m-1]-z[m-1]-x[m-1]-c[m-1],base))
    c.append((x[m-1]+y[m]+z[m-1]+c[m-1]-num[m-1])//base)
    if c[m]==1:
        pass
    elif c[m]==0:
        x[m]=1
    elif c[m]==2:
        if y[m-1]!=0:
            if z[m-1]!= base-1:
                y[m-1]-=1
                y[m]-=1
                z[m-1]+=1
            else:
                x[m]=1
                y[m-1]-=1
                z[m-1]=0
        else:
            if z[m-1]!=base-1:
                x[m-1]-=1
                y[m-1]=base-1
                y[m]-=1
                z[m-1]+=1
            else:
                x[m-1]-=1
                x[m]=1
                y[m-1]=base-1
                z[m-1]=0
    y,z=y[1:],z[1:]
    t_x=x[::-1]
    t_x=t_x[1:]
    x=x+t_x
    z=z+z[::-1]
    t_y=y[::-1]
    t_y=t_y[1:]
    y=y+t_y
    config=[x,y,z]
    return config

def algorithm_4(number,config,base):
    _note("algorithm", "IV")
    num=number[::-1]
    x,y,z=config[0],config[1],config[2]
    length=len(num)
    m=length>>1
    y=[0]+y
    z=[0]+z
    c=[0,(1+y[1]+z[1])//base]
    x.append(d(num[2*m-3]-y[1],base) if z[1]<=num[2*m-4]-1 else d(num[2*m-3]-y[1]-1,base))
    y.append(d(num[2*m-4]-z[1]-1,base))
    z.append(d(num[1]-x[1]-y[2]-c[1],base))
    c.append((x[1]+y[2]+z[2]+c[1]-num[1])//base)
    for i in range(3,m-1):
        x.append(1 if z[i-1]<=num[2*m-i-2]-1 else 0)
        y.append(d(num[2*m-i-2]-z[i-1]-1,base))
        z.append(d(num[i-1]-x[i-1]-y[i]-c[i-1],base))
        c.append((x[i-1]+y[i]+z[i]+c[i-1]-num[i-1])//base)
    x.append(1 if z[m-2]<=num[m-1]-1 else 0)
    y.append(d(num[m-1]-z[m-2]-1,base))
    z.append(d(num[m-2]-x[m-2]-y[m-1]-c[m-2],base))
    c.append((x[m-2]+y[m-1]+z[m-1]+c[m-2]-num[m-2])//base)
    if x[m-1]+ c[m-1]==1:
        pass
    elif x[m-1]+c[m-1]==0 and y[m-1]!= base -1 :
        if z[m-1]!=0:
            y[m-1]+=1
            z[m-1]-=1
        elif z[m-1]==0 and y[m-2]!=0:
            if y[m-1]!=1 and z[m-2]!= base - 1:
                x[m-1]=1
                y[m-2]-=1
                y[m-1]-=1
                z[m-2]+=1
                z[m-1]+=1
            elif y[m-1]!=1 and z[m-2]==base - 1:
                x[m-1]=2
                y[m-2]-=1
                y[m-1]-=2
                z[m-2]=0
                z[m-1]=3
            elif y[m-1]==1:
                x[m-1]=1
                y[m-2]-=1
                y[m-1]=base - 1
                z[m-2]=0
                z[m-1]=3
        elif z[m-1]==0 and y[m-2]==0:
            if z[m-2]!= base - 1:
                x[m-2]-=1
                x[m-1]=1
                y[m-2]=base - 1
                y[m-1]-=1
                z[m-2]+=1
                z[m-1]=1
            elif z[m-2]== base - 1 and y[m-1]!=1:
                x[m-2]-=1
                x[m-1]=2
                y[m-2]=base-1
                y[m-1]-=2
                z[m-2]=0
                z[m-1]=3
            elif z[m-2]== base - 1 and y[m-1]==1:
                x[m-2]-=1
                x[m-1]=1
                y[m-2]=base-1
                y[m-1]=base-1
                z[m-2]=0
                z[m-1]=3
    elif x[m-1]+c[m-1]==0 and y[m-1]==base-1:
        x[m-1]=1
        y[m-2]-=1
        y[m-1]=base-2
        z[m-2]+=1
        z[m-1]=1
    elif x[m-1]+c[m-1]==2 and x[m-1]==0 and c[m-1]==2:
        if z[m-1]!=base-1:
            y[m-1]-=1
            z[m-1]+=1
        elif z[m-1]==base-1 and z[m-2]!=base-1:
            if y[m-2]!=0:
                x[m-1]=1
                y[m-2]-=1
                y[m-1]-=2
                z[m-2]+=1
                z[m-1]=1
            elif y[m-2]==0:
                x[m-2]-=1
                x[m-1]=1
                y[m-2]=base-1
                y[m-1]-=2
                z[m-2]+=1
                z[m-1]=1
        elif z[m-1]==base-1 and z[m-2]==base-1:
            # IV.4.iii.a: the case split is on y[m-1] (not y[m-2]) being g-1 or g-2
            if y[m-1]<base-2:
                if y[m-2]!=base-1:
                    x[m-2]-=1
                    x[m-1]=base-2
                    y[m-2]+=1
                    y[m-1]+=2
                    z[m-1]=base-2
                    z[m-2]=base-2
                else:
                    x[m-1]=base-2
                    y[m-2]=0
                    y[m-1]+=2
                    z[m-1]=base-2
                    z[m-2]=base-2
            else:
                if y[m-2]>=1:
                    x[m-1]=2
                    y[m-2]-=1
                    y[m-1]-=3
                    z[m-2]=0
                    z[m-1]=3
                else:
                    x[m-2]-=1
                    x[m-1]=2
                    y[m-2]=base-1
                    y[m-1]-=3
                    z[m-2]=0
                    z[m-1]=3
    elif x[m-1]+c[m-1]==2 and x[m-1]==1 and c[m-1]==1:
        if z[m-1]!=base-1 and y[m-1]!=0:
            y[m-1]-=1
            z[m-1]+=1
        elif z[m-1]!=base-1 and y[m-1]==0:
            x[m-1]=0
            y[m-1]=base-1
            z[m-1]+=1
        elif z[m-1]==base-1 and z[m-2]!=0:
            if y[m-2]!=base-1:
                x[m-1]=0
                y[m-2]+=1
                y[m-1]+=1
                z[m-2]-=1
                z[m-1]=base-2
            elif y[m-2]==base-1 and y[m-1]>1:
                x[m-1]=2
                y[m-2]=base-2
                y[m-1]-=2
                z[m-2]+=1
                z[m-1]=1
            elif y[m-2]==base-1 and y[m-1]==0:
                y[m-2]=base-2
                y[m-1]=base-2
                z[m-2]+=1
                z[m-1]=1
            elif y[m-2]==base-1 and y[m-1]==1:
                y[m-2]=base-2
                y[m-1]=base-1
                z[m-2]+=1
                z[m-1]=1 
        elif z[m-1]==base-1 and z[m-2]==0 and y[m-2]!=0:
            if y[m-1]>1:
                x[m-1]=2
                y[m-2]-=1
                y[m-1]-=2
                z[m-2]=1
                z[m-1]=1
            elif y[m-1]==0:
                y[m-2]-=1
                y[m-1]=base-2
                z[m-2]=1
                z[m-1]=1
            elif y[m-1]==1:
                y[m-2]-=1
                y[m-1]=base-1
                z[m-2]=1
                z[m-1]=1
        elif z[m-1]==base-1 and z[m-2]==0 and y[m-2]==0:
            if y[m-1]>1:
                x[m-2]-=1
                x[m-1]=2
                y[m-2]=base-1
                y[m-1]-=2
                z[m-2]=1
                z[m-1]=1
            elif y[m-1]==0:
                x[m-2]-=1
                y[m-2]=base-1
                y[m-1]=base-2
                z[m-2]=1
                z[m-1]=1
            elif y[m-1]==1:
                x[m-2]-=1
                y[m-2]=base-1
                y[m-1]=base-1
                z[m-2]=1
                z[m-1]=1
    elif x[m-1]+c[m-1]==3:
        y[m-1]-=1
        z[m-1]=0
    y,z=y[1:],z[1:]
    x,y=x+x[::-1],y+y[::-1]
    t_z=z[::-1]
    z=z+t_z[1:]
    config=[x,y,z]
    return config
        
def algorithm_5(number,config,base):
    _note("algorithm", "V")
    length=len(number)
    m=length>>1
    s=[0]*length
    s[m],s[m-1]=1,1
    rev_num=number[::-1]
    digits=big_sub(rev_num,s,base)
    if digits[-1]==0:
        digits=digits[0:len(digits)-1]
    else:
        pass
    if digits[m-1]==0 or digits[m]==0:
        s[m],s[m-1]=2,2
        rev_num=number[::-1]
        digits=big_sub(rev_num,s,base)
        if digits[-1]==0:
            digits=digits[0:len(digits)-1]
        else:
            pass
    res=digits[::-1]
    [t_types,t_config,t_special]=check_type(res,base)
    length=len(res)
    if t_types=="A5" or t_types=="A6":
        length_of_p1=length-1
    else:
        length_of_p1=length
    even=(length_of_p1%2==0)
    if even:
        if length==6:
            result=six_digit_sum(res,base)
        else:
            result=main_algorithm(res,base)
    else:
        if length==6:
            result=six_digit_sum(res,base)
        else:
            z1=d(res[-1]-res[2],base)
            if z1!=0:
                debug("Pseudo-B1")
                p1=[1,res[1]]
                p2=[res[2]-1]
                p3=[z1]
            elif z1==0:
                debug("Pseudo-B2")
                p1=[1,res[1]]
                p2=[res[2]-2]
                p3=[1]
            s_config=[p1,p2,p3]
            result=algorithm_4(res,s_config,base)
    p1=result[0]
    p1[m]+=s[m]
    p1[m-1]+=s[m-1]
    result[0]=p1
    return result


# -- Using it ------------------------------------------------------------

def to_digits(n, base):
    """The digits of n in the given base, most significant first."""
    if n == 0:
        return [0]
    out = []
    while n:
        out.append(n % base)
        n //= base
    return out[::-1]

def from_digits(digits, base):
    n = 0
    for x in digits:
        n = n * base + x
    return n

def digits_to_text(digits):
    return "".join(DIGITS[x] for x in digits)

def is_palindrome(digits):
    return digits == digits[::-1]

def _strip(digits):
    digits = list(digits)
    while len(digits) > 1 and digits[0] == 0:
        digits.pop(0)
    return digits

def parse_number(text, base):
    """'1F3' in base 16 -> [1, 15, 3]. Raises ValueError for bad input."""
    if not (MIN_BASE <= base <= MAX_BASE):
        raise ValueError("The base must be between %d and %d." % (MIN_BASE, MAX_BASE))
    s = "".join(str(text).split()).upper()
    if not s:
        raise ValueError("Enter a number.")
    digits = []
    for ch in s:
        v = DIGITS.find(ch)
        if v < 0 or v >= base:
            raise ValueError("'%s' is not a digit in base %d (the digits are 0-%s)." % (ch, base, DIGITS[base - 1]))
        digits.append(v)
    return _strip(digits)

def three_palindromes(digits, base):
    """The digits of n -> the digits of three palindromes that add up to n.

    Every answer is checked before it is returned; ArithmeticError means
    the algorithm went wrong, which should never happen.
    """
    digits = _strip(digits)
    _trace["type"] = None
    _trace["algorithms"] = []
    if is_palindrome(digits):
        res = [digits, [0], [0]]
    else:
        small = {2: two_digit_sum, 3: three_digit_sum, 4: four_digit_sum,
                 5: five_digit_sum, 6: six_digit_sum}
        solver = small.get(len(digits), main_algorithm)
        res = solver(list(digits), base)
    res = [_strip(p) for p in res] + [[0]] * (3 - len(res))
    ok = (len(res) == 3
          and all(is_palindrome(p) and all(0 <= x < base for x in p) for p in res)
          and sum(from_digits(p, base) for p in res) == from_digits(digits, base))
    if not ok:
        raise ArithmeticError("No valid answer for %s in base %d (got %r)." % (digits_to_text(digits), base, res))
    return sorted(res, key=lambda p: from_digits(p, base), reverse=True)

def solve(base, text):
    """For the web page: base and a number written in that base, to a dict
    with the three palindromes (in that base and in base 10)."""
    base = int(base)
    digits = parse_number(text, base)
    res = three_palindromes(digits, base)
    return {
        "base": base,
        "number": digits_to_text(digits),
        "decimal": str(from_digits(digits, base)),
        "palindromes": [digits_to_text(p) for p in res],
        "decimals": [str(from_digits(p, base)) for p in res],
        "type": _trace["type"],
        "algorithms": list(dict.fromkeys(_trace["algorithms"])),
    }

def show(result):
    """Print a result from solve() as a column sum."""
    p = result["palindromes"]
    w = max(len(x) for x in p + [result["number"]]) + 2
    print("    " + p[0].rjust(w))
    print("    " + ("+ " + p[1]).rjust(w))
    print("    " + ("+ " + p[2]).rjust(w))
    print("    " + "-" * w)
    print("    " + result["number"].rjust(w) + "   (base %d)" % result["base"])

def main():
    print("Every positive integer is a sum of three palindromes, in any base from %d to %d." % (MIN_BASE, MAX_BASE))
    while True:
        try:
            base = input("\nBase (blank to quit): ").strip()
            if not base:
                return 0
            number = input("Number in base %s: " % base)
            show(solve(int(base), number))
        except ValueError as e:
            print("  " + str(e) if str(e) and not str(e).startswith("invalid literal") else "  The base must be a whole number.")
        except (EOFError, KeyboardInterrupt):
            return 0

def test(start, end, base):
    """Check every number from start to end (in base 10) written in the given base."""
    began = time.time()
    for n in range(start, end + 1):
        three_palindromes(to_digits(n, base), base)    # raises if an answer is wrong
    took = time.time() - began
    count = end - start + 1
    print("All %d numbers passed in base %d: %.2f s (%.1f us each)." % (count, base, took, 1e6 * took / max(count, 1)))
    return 0

if __name__ == "__main__":
    import sys
    if len(sys.argv) == 5 and sys.argv[1] == "test":
        test(int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]))
    elif len(sys.argv) > 1:
        print("Usage: python3 sumof3palindromes.py            (interactive)\n"
              "       python3 sumof3palindromes.py test START END BASE")
    else:
        main()
